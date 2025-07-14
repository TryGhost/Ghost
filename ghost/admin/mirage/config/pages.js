import moment from 'moment-timezone';
import {Response} from 'miragejs';
import {dasherize} from '@ember/string';
import {getPages} from './posts';
import {isBlank} from '@ember/utils';

// NOTE: mirage requires Model objects when saving relationships, however the
// `attrs` on POST/PUT requests will contain POJOs for authors and tags so we
// need to replace them
function extractAuthors(pageAttrs, users) {
    return pageAttrs.authors.map(author => users.find(author.id));
}

function extractTags(pageAttrs, tags) {
    return pageAttrs.tags.map((requestTag) => {
        let tag = tags.find(requestTag.id);

        if (!tag) {
            tag = tag.create(requestTag);
        }

        return tag;
    });
}

export default function mockPages(server) {
    server.post('/pages', function ({pages, users, tags}) {
        let attrs = this.normalizedRequestAttrs();

        attrs.authors = extractAuthors(attrs, users);
        attrs.tags = extractTags(attrs, tags);

        if (isBlank(attrs.slug) && !isBlank(attrs.title)) {
            attrs.slug = dasherize(attrs.title);
        }

        return pages.create(attrs);
    });

    server.get('/pages/', getPages);

    server.get('/pages/:id/', function ({pages}, {params}) {
        let {id} = params;
        let page = pages.find(id);

        return page || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Page not found.'
            }]
        });
    });

    server.put('/pages/:id/', function ({pages, users, tags}, {params}) {
        let attrs = this.normalizedRequestAttrs();
        let page = pages.find(params.id);

        attrs.authors = extractAuthors(attrs, users);
        attrs.tags = extractTags(attrs, tags);

        attrs.updatedAt = moment.utc().toDate();

        return page.update(attrs);
    });

    server.del('/pages/:id/');
}
