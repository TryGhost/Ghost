import {dasherize} from '@ember/string';
import {extractFilterParam, paginateModelCollection} from '../utils';
import {isBlank} from '@ember/utils';

export default function mockTags(server) {
    server.post('/tags/', function ({tags}) {
        let attrs = this.normalizedRequestAttrs();

        if (isBlank(attrs.slug) && !isBlank(attrs.name)) {
            attrs.slug = dasherize(attrs.name);
        }

        // NOTE: this does not use the tag factory to fill in blank fields
        return tags.create(attrs);
    });

    server.get('/tags/slug/:slug/', function ({tags}, {params: {slug}}) {
        // TODO: remove post_count unless requested?
        return tags.findBy({slug});
    });

    server.get('/tags/', function ({tags}, {queryParams}) {
        const {filter, page = 1, limit = 15} = queryParams;
        const tagsName = extractFilterParam('tags.name', filter);

        let collection = tags.all();

        if (tagsName) {
            collection = collection.filter(tag => tag.name.toLowerCase().includes(tagsName.toLowerCase()));
        }

        return paginateModelCollection('tags', collection, page, limit);
    });
    server.get('/tags/:id/');
    server.put('/tags/:id/');
    server.del('/tags/:id/');
}
