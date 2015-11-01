import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    model: function (params) {
        return this.store.findRecord('tag', params.tag_id);
    }

});
