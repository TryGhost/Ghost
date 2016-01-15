import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

const {RSVP, inject, Service} = Ember;

export default Service.extend({
    ghostPaths: inject.service('ghost-paths'),

    generateSlug(slugType, textToSlugify) {
        let url;

        if (!textToSlugify) {
            return RSVP.resolve('');
        }

        url = this.get('ghostPaths.url').api('slugs', slugType, encodeURIComponent(textToSlugify));

        return ajax(url).then((response) => {
            let [firstSlug] = response.slugs;
            let {slug} = firstSlug;

            return slug;
        });
    }
});
