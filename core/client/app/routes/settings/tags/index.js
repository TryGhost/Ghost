import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({

    // HACK: ugly way of changing behaviour when on mobile
    beforeModel: function () {
        const firstTag = this.modelFor('settings.tags').get('firstObject'),
              mobileWidth = this.controllerFor('settings.tags').get('mobileWidth'),
              viewportWidth = Ember.$(window).width();

        if (firstTag && viewportWidth > mobileWidth) {
            this.transitionTo('settings.tags.tag', firstTag);
        }
    }

});
