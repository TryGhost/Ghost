import {dasherize} from '@ember/string';
import {isBlank} from '@ember/utils';
import {paginatedResponse} from '../utils';

export default function mockTags(server) {
    server.post('/tags/', function ({tags}) {
        let attrs = this.normalizedRequestAttrs();

        if (isBlank(attrs.slug) && !isBlank(attrs.name)) {
            attrs.slug = dasherize(attrs.name);
        }

        // NOTE: this does not use the tag factory to fill in blank fields
        return tags.create(attrs);
    });

    server.get('/tags/', paginatedResponse('tags'));

    server.get('/tags/slug/:slug/', function ({tags}, {params: {slug}}) {
        // TODO: remove post_count unless requested?
        return tags.findBy({slug});
    });

    server.put('/tags/:id/');

    server.del('/tags/:id/');
}
