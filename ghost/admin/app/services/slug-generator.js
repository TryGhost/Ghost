import Service from 'ember-service';
import RSVP from 'rsvp';
import injectService from 'ember-service/inject';

const {resolve} = RSVP;

export default Service.extend({
    ghostPaths: injectService(),
    ajax: injectService(),

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
