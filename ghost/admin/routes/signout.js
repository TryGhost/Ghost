import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SignoutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-signout'],

    beforeModel: function () {
        var self = this;

        ajax({
            url: this.get('ghostPaths').adminUrl('signout'),
            type: 'POST',
            headers: {
                'X-CSRF-Token': this.get('csrf')
            }
        }).then(function () {
            self.notifications.showSuccess('You were successfully signed out.');
            self.transitionTo('signin');
        }, function (resp) {
            self.notifications.showAPIError(resp, 'There was a problem logging out, please try again.');
            self.transitionTo('posts');
        });
    }
});

export default SignoutRoute;
