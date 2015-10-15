import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    beforeModel: function () {
        const firstTag = this.modelFor('settings.tags').get('firstObject');

        if (firstTag) {
            this.transitionTo('settings.tags.tag', firstTag);
        }
    }

});
