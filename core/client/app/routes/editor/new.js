import AuthenticatedRoute from 'ghost/routes/authenticated';
import base from 'ghost/mixins/editor-base-route';

export default AuthenticatedRoute.extend(base, {
    titleToken: 'Editor',

    model: function () {
        var self = this;
        return this.get('session.user').then(function (user) {
            return self.store.createRecord('post', {
                author: user
            });
        });
    },

    renderTemplate: function (controller, model) {
        this.render('editor/edit', {
            controller: controller,
            model: model
        });

        this.render('post-settings-menu', {
            into: 'application',
            outlet: 'settings-menu',
            model: model
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
    },

    actions: {
        willTransition: function (transition) {
            // decorate the transition object so the editor.edit route
            // knows this was the previous active route
            transition.data.fromNew = true;

            this._super(...arguments);
        }
    }
});
