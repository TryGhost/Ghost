import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    controllerName: 'settings.tags.tag',

    model() {
        return this.store.createRecord('tag');
    },

    renderTemplate() {
        this.render('settings.tags.tag');
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate() {
        this.set('controller.model', null);
    }

});
