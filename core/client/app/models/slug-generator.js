import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

const {RSVP, inject} = Ember;

export default Ember.Object.extend({
    slugType: null,
    value: null,

    ghostPaths: inject.service('ghost-paths'),

    toString() {
        return this.get('value');
    },

    generateSlug(textToSlugify) {
        let url;

        if (!textToSlugify) {
            return RSVP.resolve('');
        }

        url = this.get('ghostPaths.url').api('slugs', this.get('slugType'), encodeURIComponent(textToSlugify));

        return ajax(url, {
            type: 'GET'
        }).then((response) => {
            let [firstSlug] = response.slugs;
            let {slug} = firstSlug;

            this.set('value', slug);

            return slug;
        });
    }
});
