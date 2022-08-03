import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';

const {resolve} = RSVP;

@classic
export default class SlugGeneratorService extends Service {
    @service ghostPaths;
    @service ajax;

    generateSlug(slugType, textToSlugify) {
        let url;

        if (!textToSlugify) {
            return resolve('');
        }

        url = this.get('ghostPaths.url').api('slugs', slugType, encodeURIComponent(textToSlugify));

        return this.ajax.request(url).then((response) => {
            let [firstSlug] = response.slugs;
            let {slug} = firstSlug;

            return slug;
        });
    }
}
