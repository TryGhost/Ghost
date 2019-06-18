import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({

    controllerName: 'tags.tag',

    model() {
        return this.store.createRecord('tag');
    },

    renderTemplate() {
        this.render('tags.tag');
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate() {
        this._super(...arguments);
        this.set('controller.model', null);
    }

});
