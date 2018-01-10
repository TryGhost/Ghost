import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({

    model() {
        return this.get('store').findAll('theme');
    },

    setupController(controller, model) {
        controller.set('themes', model);
    },

    actions: {
        cancel() {
            this.transitionTo('settings.design');
        }
    }
});
