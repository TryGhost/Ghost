import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var DebugRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
    classNames: ['settings'],

    beforeModel: function () {
        var self = this;
        this.store.find('user', 'me').then(function (user) {
            if (user.get('isAuthor') || user.get('isEditor')) {
                self.transitionTo('posts');
            }
        });
    },

    model: function () {
        return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
            return records.get('firstObject');
        });
    }

});

export default DebugRoute;
