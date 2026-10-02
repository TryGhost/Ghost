import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import {slugify} from '@tryghost/string';

const {resolve} = RSVP;

@classic
export default class SlugGeneratorService extends Service {
    @service ghostPaths;
    @service ajax;

    generateSlug(slugType, textToSlugify, modelId) {
        let url;

        if (!textToSlugify) {
            return resolve('');
        }

        // We already do a partial slugify at the client side to prevent issues with Pro returning a 404 page because of invalid (encoded) characters (a newline, %0A, for example)
        const name = encodeURIComponent(slugify(textToSlugify));
        if (modelId) {
            url = this.get('ghostPaths.url').api('slugs', slugType, name, modelId);
        } else {
            url = this.get('ghostPaths.url').api('slugs', slugType, name);
        }

        return this.ajax.request(url).then((response) => {
            const [firstSlug] = response.slugs;
            const {slug} = firstSlug;

            return slug;
        });
    }
}
