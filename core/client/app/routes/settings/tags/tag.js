import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    model: function (params) {
        return this.store.findRecord('tag', params.tag_id);
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate: function () {
        this.set('controller.model', null);
    }

});
