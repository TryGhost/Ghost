import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    settings: service(),
    notifications: service(),
    queryParams: {
        fromAddressUpdate: {
            replace: true
        },
        supportAddressUpdate: {
            replace: true
        }
    },

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model() {
        return this.settings.reload();
    },

    setupController(controller) {
        if (controller.fromAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Newsletter email address has been updated`.htmlSafe(),
                {type: 'success', key: 'members.settings.from-address.updated'}
            );
        } else if (controller.supportAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Support email address has been updated`.htmlSafe(),
                {type: 'success', key: 'members.settings.support-address.updated'}
            );
        }
    },

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Members'
        };
    }
});
