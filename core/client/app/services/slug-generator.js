import Ember from 'ember';

const {
    RSVP: {resolve},
    inject: {service},
    Service
} = Ember;

export default Service.extend({
    ghostPaths: service(),
    ajax: service(),

    generateSlug(slugType, textToSlugify) {
        let url;

        if (!textToSlugify) {
            return resolve('');
        }

        url = this.get('ghostPaths.url').api('slugs', slugType, encodeURIComponent(textToSlugify));

        return this.get('ajax').request(url).then((response) => {
            let [firstSlug] = response.slugs;
            let {slug} = firstSlug;

            return slug;
        });
    }
});
