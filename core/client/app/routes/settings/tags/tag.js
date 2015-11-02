import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    model: function (params) {
        return this.store.queryRecord('tag', {slug: params.tag_slug});
    },

    serialize: function (model) {
        return {tag_slug: model.get('slug')};
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate: function () {
        this.set('controller.model', null);
    }

});
