import ESASessionService from 'ember-simple-auth/services/session';
import RSVP from 'rsvp';
import {configureScope} from '@sentry/ember';
import {getOwner} from '@ember/application';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class SessionService extends ESASessionService {
    @service config;
    @service('store') dataStore;
    @service feature;
    @service notifications;
    @service router;
    @service frontend;
    @service settings;
    @service ui;
    @service upgradeStatus;
    @service whatsNew;

    @tracked user = null;

    skipAuthSuccessHandler = false;
    forceTransition = false;

    async populateUser(options = {}) {
        if (this.user) {
            return;
        }

        const id = options.id || 'me';
        const user = await this.dataStore.queryRecord('user', {id});
        this.user = user;
    }

    async postAuthPreparation() {
        await RSVP.all([
            this.config.fetchAuthenticated(),
            this.feature.fetch(),
            this.settings.fetch()
        ]);

        await this.frontend.loginIfNeeded();

        // update Sentry with the full Ghost version which we only get after authentication
        if (this.config.get('sentry_dsn')) {
            configureScope((scope) => {
                scope.addEventProcessor((event) => {
                    return new Promise((resolve) => {
                        resolve({
                            ...event,
                            release: `ghost@${this.config.get('version')}`
                        });
                    });
                });
            });
        }

        this.loadServerNotifications();
        this.whatsNew.fetchLatest.perform();
    }

    async handleAuthentication() {
        if (this.handleAuthenticationTask.isRunning) {
            return this.handleAuthenticationTask.last;
        }

        return this.handleAuthenticationTask.perform(() => {
            if (this.skipAuthSuccessHandler) {
                this.skipAuthSuccessHandler = false;
                return;
            }

            super.handleAuthentication('home');
        });
    }

    async requireAuthentication(transition, route) {
        if (!this.isAuthenticated) {
            /**
             * Always try to re-setup session if user data is still available
             * although the session is invalid and retry the original transition.
             * If success, it will retry the original transition.
             * If failed, it will be handled by the redirect to sign in.
             */
            await this.reSetupSession(transition);
        }

        super.requireAuthentication(transition, route);
    }

    // TODO: feels a bit hacky, maybe got a better way to handle this
    async reSetupSession(transition) {
        if (this.user) {
            await this.setup();
            this.forceTransition = true;
            this.notifications.clearAll();
        }

        // retry previous transition if there is active session
        if (this.forceTransition) {
            this.forceTransition = false;
            transition.retry();
            return;
        }
    }

    handleInvalidation() {
        let transition = this.appLoadTransition;

        if (transition) {
            transition.send('authorizationFailed');
        } else {
            run.scheduleOnce('routerTransitions', this, 'triggerAuthorizationFailed');
        }
    }

    // TODO: this feels hacky, find a better way than using .send
    triggerAuthorizationFailed() {
        getOwner(this).lookup(`route:${this.router.currentRouteName}`).send('authorizationFailed');
    }

    loadServerNotifications() {
        if (this.isAuthenticated) {
            if (!this.user.isAuthorOrContributor) {
                this.dataStore.findAll('notification', {reload: true}).then((serverNotifications) => {
                    serverNotifications.forEach((notification) => {
                        if (notification.top || notification.custom) {
                            this.notifications.handleNotification(notification);
                        } else {
                            this.upgradeStatus.handleUpgradeNotification(notification);
                        }
                    });
                });
            }
        }
    }

    @task({drop: true})
    *handleAuthenticationTask(callback) {
        if (!this.user) {
            try {
                yield this.populateUser();
            } catch (err) {
                yield this.invalidate();
            }

            yield this.postAuthPreparation();
        }

        callback();
    }
}
