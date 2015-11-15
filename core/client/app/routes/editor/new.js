import AuthenticatedRoute from 'ghost/routes/authenticated';
import base from 'ghost/mixins/editor-base-route';

export default AuthenticatedRoute.extend(base, {
    titleToken: 'Editor',

    model() {
        return this.get('session.user').then((user) => {
            return this.store.createRecord('post', {
                author: user
            });
        });
    },

    renderTemplate(controller, model) {
        this.render('editor/edit', {
            controller,
            model
        });

        this.render('post-settings-menu', {
            model,
            into: 'application',
            outlet: 'settings-menu'
        });
    },

    setupController() {
        let psm = this.controllerFor('post-settings-menu');

        // make sure there are no titleObserver functions hanging around
        // from previous posts
        psm.removeObserver('titleScratch', psm, 'titleObserver');

        // Ensure that the PSM Image Uploader and Publish Date selector resets
        psm.send('resetUploader');
        psm.send('resetPubDate');

        this._super(...arguments);
    },

    actions: {
        willTransition(transition) {
            // decorate the transition object so the editor.edit route
            // knows this was the previous active route
            transition.data.fromNew = true;

            this._super(...arguments);
        }
    }
});
