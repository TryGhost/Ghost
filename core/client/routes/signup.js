import styleBody from 'ghost/mixins/style-body';
import ajax from 'ghost/utils/ajax';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SignupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-signup'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.notifications.showWarn('You need to sign out to register as a new user.', true);
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
        }
    },
    setupController: function (controller, params) {
        var tokenText = atob(params.token),
            email = tokenText.split('|')[1],
            self = this;
        controller.token = params.token;
        controller.email = email;

        ajax({
            url: self.get('ghostPaths.url').api('authentication', 'invitationcheck'),
            type: 'POST',
            dataType: 'json',
            data: {
                invitationcheck: [{
                    email: email
                }]
            }
        }).catch(function () {
            controller.toggleProperty('submitting');
            self.notifications.showError('This invitation link is not valid or has been revoked.', true);
        });
    }
});

export default SignupRoute;
