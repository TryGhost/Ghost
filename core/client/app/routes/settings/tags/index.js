import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    mediaQueries: Ember.inject.service(),

    beforeModel: function () {
        let firstTag = this.modelFor('settings.tags').get('firstObject');
        if (firstTag && !this.get('mediaQueries.maxWidth600')) {
            this.transitionTo('settings.tags.tag', firstTag);
        }
    }

});
