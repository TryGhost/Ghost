import AdminRoute from 'ghost-admin/routes/admin';
import VerifyEmail from '../../components/modals/settings/verify-email';
import {inject as service} from '@ember/service';

export default class MembershipSettingsRoute extends AdminRoute {
    @service notifications;
    @service settings;
    @service modals;

    queryParams = {
        verifyEmail: {
            replace: true
        }
    };

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // @todo: remove in the future, but keep it for now because we might still have some old verification urls in emails
        if (transition.to.queryParams?.supportAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Support email address has been updated`,
                {type: 'success', key: 'members.settings.support-address.updated'}
            );
        }
    }

    model() {
        this.settings.reload();
    }

    afterModel(model, transition) {
        if (transition.to.queryParams.verifyEmail) {
            this.modals.open(VerifyEmail, {
                token: transition.to.queryParams.verifyEmail
            });

            // clear query param so it doesn't linger and cause problems re-entering route
            transition.abort();
            return this.transitionTo('settings.membership', {queryParams: {verifyEmail: null}});
        }
    }

    actions = {
        willTransition(transition) {
            return this.controller.leaveRoute(transition);
        }
    };

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Membership'
        };
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    }
}
