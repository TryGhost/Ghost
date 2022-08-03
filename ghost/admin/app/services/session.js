import ESASessionService from 'ember-simple-auth/services/session';
import RSVP from 'rsvp';
import {configureScope} from '@sentry/browser';
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
