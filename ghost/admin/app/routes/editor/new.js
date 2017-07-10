import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import base from 'ghost-admin/mixins/editor-base-route';

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
    }
});
