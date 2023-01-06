import ESASessionService from 'ember-simple-auth/services/session';
import RSVP from 'rsvp';
import {configureScope} from '@sentry/ember';
import {getOwner} from '@ember/application';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class SessionService extends ESASessionService {
    @service configManager;
    @service('store') dataStore;
    @service feature;
    @service notifications;
    @service router;
    @service frontend;
    @service settings;
    @service ui;
    @service upgradeStatus;
    @service whatsNew;
    @service membersUtils;
    @service themeManagement;

    @inject config;

    @tracked user = null;

    skipAuthSuccessHandler = false;

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
            this.configManager.fetchAuthenticated(),
            this.feature.fetch(),
            this.settings.fetch(),
            this.membersUtils.fetch()
        ]);

        // Theme management requires features to be loaded
        this.themeManagement.fetch().catch(console.error); // eslint-disable-line no-console

        await this.frontend.loginIfNeeded();

        // update Sentry with the full Ghost version which we only get after authentication
        if (this.config.sentry_dsn) {
            configureScope((scope) => {
                scope.addEventProcessor((event) => {
                    return new Promise((resolve) => {
                        resolve({
                            ...event,
                            release: `ghost@${this.config.version}`,
                            'user.role': this.user.role.name
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

    /**
     * Always try to re-setup session & retry the original transition
     * if user data is still available in session store although the
     * ember-session is unauthenticated.
     *
     * If success, it will retry the original transition.
     * If failed, it will be handled by the redirect to sign in.
     */
    async requireAuthentication(transition, route) {
        // Only when ember session invalidated
        if (!this.isAuthenticated) {
            transition.abort();

            if (this.user) {
                await this.setup();
                this.notifications.clearAll();
                transition.retry();
            }
        }

        super.requireAuthentication(transition, route);
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
        getOwner(this).lookup(`route:${this.router.currentRouteName}`)?.send('authorizationFailed');
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
