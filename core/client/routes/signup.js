import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SignupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-signup'],
    beforeModel: function () {
        if (this.get('session').isAuthenticated) {
            this.notifications.showWarn('You need to sign out to register as a new user.', { delayed: true });
            this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
        }
    },
    setupController: function (controller, params) {
        var self = this,
            tokenText,
            email,
            re = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
        if (re.test(params.token)) {
            try {
                tokenText = atob(params.token);
                email = tokenText.split('|')[1];
                controller.token = params.token;
                controller.email = email;
            } catch (e) {
                this.transitionTo('signin');
                this.notifications.showError('Invalid token.', {delayed: true});
            }

            ajax({
                url: this.get('ghostPaths.url').api('authentication', 'invitation'),
                type: 'GET',
                dataType: 'json',
                data: {
                    email: email
                }
            }).then(function (response) {
                if (response && response.invitation && response.invitation[0].valid === false) {
                    self.transitionTo('signin');
                    self.notifications.showError('The invitation does not exist or is no longer valid.', {delayed: true});
                }
            }).catch(function (error) {
                self.notifications.showAPIError(error);
            });

        } else {
            this.transitionTo('signin');
            this.notifications.showError('Invalid token.', {delayed: true});
        }
    }
});

export default SignupRoute;
