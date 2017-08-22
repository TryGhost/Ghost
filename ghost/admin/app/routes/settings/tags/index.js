import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as injectService} from '@ember/service';

export default AuthenticatedRoute.extend({
    mediaQueries: injectService(),

    beforeModel() {
        let firstTag = this.modelFor('settings.tags').get('firstObject');

        this._super(...arguments);

        if (firstTag && !this.get('mediaQueries.maxWidth600')) {
            this.transitionTo('settings.tags.tag', firstTag);
        }
    }
});
