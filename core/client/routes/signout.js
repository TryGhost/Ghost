import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';

var SignoutRoute = Ember.Route.extend(styleBody, {
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

            // @TODO: new CSRF token to enable logging back in w/o refreshing - see issue #2861 for details
            self.transitionTo('signin');
        }, function (resp) {
            self.notifications.showAPIError(resp, 'There was a problem logging out, please try again.');
            self.transitionTo('posts');
        });
    }
});

export default SignoutRoute;