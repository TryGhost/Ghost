import Ember from 'ember';

const {RSVP, inject, Service} = Ember;

export default Service.extend({
    ghostPaths: inject.service('ghost-paths'),
    ajax: inject.service(),

    generateSlug(slugType, textToSlugify) {
        let url;

        if (!textToSlugify) {
            return RSVP.resolve('');
        }

        url = this.get('ghostPaths.url').api('slugs', slugType, encodeURIComponent(textToSlugify));

        return this.get('ajax').request(url).then((response) => {
            let [firstSlug] = response.slugs;
            let {slug} = firstSlug;

            return slug;
        });
    }
});
