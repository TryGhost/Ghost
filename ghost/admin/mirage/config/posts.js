import moment from 'moment-timezone';
import {Response} from 'miragejs';
import {dasherize} from '@ember/string';
import {extractFilterParam, paginateModelCollection} from '../utils';
import {isBlank, isEmpty} from '@ember/utils';

// NOTE: mirage requires Model objects when saving relationships, however the
// `attrs` on POST/PUT requests will contain POJOs for authors and tags so we
// need to replace them
function extractAuthors(postAttrs, users) {
    return postAttrs.authors.map(author => users.find(author.id));
}

function extractTags(postAttrs, tags) {
    return postAttrs.tags.map((requestTag) => {
        let tag = tags.find(requestTag.id);

        if (!tag) {
            tag = tag.create(requestTag);
        }

        return tag;
    });
}

// TODO: handle authors filter
export function getPosts({posts}, {queryParams}) {
    let {filter, page, limit} = queryParams;

    page = +page || 1;
    limit = +limit || 15;

    let statusFilter = extractFilterParam('status', filter);

    let collection = posts.all().filter((post) => {
        let matchesStatus = true;

        if (!isEmpty(statusFilter)) {
            matchesStatus = statusFilter.includes(post.status);
        }

        return matchesStatus;
    });

    return paginateModelCollection('posts', collection, page, limit);
}

export default function mockPosts(server) {
    server.post('/posts', function ({posts, users, tags}) {
        let attrs = this.normalizedRequestAttrs();

        attrs.authors = extractAuthors(attrs, users);
        attrs.tags = extractTags(attrs, tags);

        if (isBlank(attrs.slug) && !isBlank(attrs.title)) {
            attrs.slug = dasherize(attrs.title);
        }

        return posts.create(attrs);
    });

    // TODO: handle authors filter
    server.get('/posts/', getPosts);

    server.get('/posts/:id/', function ({posts}, {params}) {
        let {id} = params;
        let post = posts.find(id);

        return post || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Post not found.'
            }]
        });
    });

    server.put('/posts/:id/', function ({newsletters, posts, users, tags}, {params, queryParams}) {
        const attrs = this.normalizedRequestAttrs();
        const post = posts.find(params.id);

        attrs.authors = extractAuthors(attrs, users);
        attrs.tags = extractTags(attrs, tags);

        attrs.updatedAt = moment.utc().toDate();

        if (queryParams.newsletter) {
            const newsletter = newsletters.findBy({slug: queryParams.newsletter});
            post.newsletter = newsletter;
            post.save();
        }

        return post.update(attrs);
    });

    server.del('/posts/:id/');

    server.del('/posts/', function ({posts}, {queryParams}) {
        let ids = extractFilterParam('id', queryParams.filter);

        posts.find(ids).destroy();
    });

    server.put('/posts/bulk/', function ({tags}, {requestBody}) {
        const bulk = JSON.parse(requestBody).bulk;
        const action = bulk.action;
        // const ids = extractFilterParam('id', queryParams.filter);

        if (action === 'addTag') {
            // create tag so we have an id from the server
            const newTags = bulk.meta.tags;
            
            // check applied tags to see if any new ones should be created
            newTags.forEach((tag) => {
                if (!tag.id) {
                    tags.create(tag);
                }
            });
            // TODO: update the actual posts in the mock db
            // const postsToUpdate = posts.find(ids);
            // getting the posts is fine, but within this we CANNOT manipulate them (???) not even iterate with .forEach
        }
    });
}
