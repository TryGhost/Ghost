import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';

const {resolve} = RSVP;

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
