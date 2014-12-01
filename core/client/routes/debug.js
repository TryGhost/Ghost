import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var DebugRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    titleToken: 'Debug',

    classNames: ['settings'],

    beforeModel: function (transition) {
        this._super(transition);

        var self = this;
        this.store.find('user', 'me').then(function (user) {
            if (user.get('isAuthor') || user.get('isEditor')) {
                self.transitionTo('posts');
            }
        });
    },

    model: function () {
        return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    }

});

export default DebugRoute;
