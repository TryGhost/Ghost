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

        // make sure there are no titleObserver functions hanging around
        // from previous posts
        psm.removeObserver('titleScratch', psm, 'titleObserver');

        // Ensure that the PSM Image Uploader and Publish Date selector resets
        psm.send('resetUploader');
        psm.send('resetPubDate');

        this._super(controller, model);
    }
});

export default EditorNewRoute;
