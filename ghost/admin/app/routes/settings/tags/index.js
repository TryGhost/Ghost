import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

const {
    inject: {service}
} = Ember;

export default AuthenticatedRoute.extend({
    mediaQueries: service(),

    beforeModel() {
        let firstTag = this.modelFor('settings.tags').get('firstObject');

        this._super(...arguments);

        if (firstTag && !this.get('mediaQueries.maxWidth600')) {
            this.transitionTo('settings.tags.tag', firstTag);
        }
    }
});
