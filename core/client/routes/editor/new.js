import AuthenticatedRoute from 'ghost/routes/authenticated';
import base from 'ghost/mixins/editor-base-route';

var EditorNewRoute = AuthenticatedRoute.extend(base, {
    titleToken: 'Editor',

    model: function () {
        var self = this;
        return this.get('session.user').then(function (user) {
            return self.store.createRecord('post', {
                author: user
            });
        });
    },

    setupController: function (controller, model) {
        var psm = this.controllerFor('post-settings-menu');

        this._super(controller, model);

        // make sure there are no titleObserver functions hanging around
        // from previous posts
        psm.removeObserver('titleScratch', psm, 'titleObserver');

        // Ensure that the publish date selector resets
        psm.send('resetPubDate');
    }
});

export default EditorNewRoute;
