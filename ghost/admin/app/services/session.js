import SessionService from 'ember-simple-auth/services/session';
import {computed} from '@ember/object';
import {getOwner} from '@ember/application';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default SessionService.extend({
    dataStore: service('store'), // SessionService.store already exists
    notifications: service(),
    router: service(),
    upgradeStatus: service(),

    user: computed(function () {
        return this.dataStore.queryRecord('user', {id: 'me'});
    }),

    authenticate() {
        // ensure any cached this.user value is removed and re-fetched
        this.notifyPropertyChange('user');

        return this._super(...arguments);
    },

    handleAuthentication() {
        if (this.skipAuthSuccessHandler) {
            return;
        }

        // standard ESA post-sign-in redirect
        this._super('home');

        // trigger post-sign-in background behaviour
        this.user.then(() => {
            this.notifications.clearAll();
            this.loadServerNotifications();
        });
    },

    handleInvalidation() {
        let transition = this.appLoadTransition;

        if (transition) {
            transition.send('authorizationFailed');
        } else {
            run.scheduleOnce('routerTransitions', this, 'triggerAuthorizationFailed');
        }
    },

    // TODO: this feels hacky, find a better way than using .send
    triggerAuthorizationFailed() {
        getOwner(this).lookup(`route:${this.router.currentRouteName}`).send('authorizationFailed');
    },

    loadServerNotifications() {
        if (this.isAuthenticated) {
            this.user.then((user) => {
                if (!user.isAuthorOrContributor) {
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
            });
        }
    }
});
