import moment from 'moment';
import {Response} from 'ember-cli-mirage';
import {dasherize} from '@ember/string';
import {isBlank} from '@ember/utils';
import {paginateModelCollection} from '../utils';

export default function mockPosts(server) {
    server.post('/posts', function ({posts, users}) {
        let attrs = this.normalizedRequestAttrs();
        let authors = [];

        // NOTE: this is necessary so that ember-cli-mirage has a valid user
        // schema object rather than a plain object
        // TODO: should ember-cli-mirage be handling this automatically?
        attrs.authors.forEach((author) => {
            authors.push(users.find(author.id));
        });

        attrs.authors = authors;

        if (isBlank(attrs.slug) && !isBlank(attrs.title)) {
            attrs.slug = dasherize(attrs.title);
        }

        return posts.create(attrs);
    });

    // TODO: handle author filter
    server.get('/posts/', function ({posts}, {queryParams}) {
        let page = +queryParams.page || 1;
        let limit = +queryParams.limit || 15;
        let {status, staticPages} = queryParams;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (staticPages === 'false') {
            query.page = false;
        }

        if (staticPages === 'true') {
            query.page = true;
        }

        let collection = posts.where(query);

        return paginateModelCollection('posts', collection, page, limit);
    });

    server.get('/posts/:id/', function ({posts}, {params}) {
        let {id} = params;
        let post = posts.find(id);

        return post || new Response(404, {}, {
            errors: [{
                errorType: 'NotFoundError',
                message: 'Post not found.'
            }]
        });
    });

    server.put('/posts/:id/', function ({posts, users}, {params}) {
        let attrs = this.normalizedRequestAttrs();
        let post = posts.find(params.id);
        let authors = [];

        // NOTE: this is necessary so that ember-cli-mirage has a valid user
        // schema object rather than a plain object
        // TODO: should ember-cli-mirage be handling this automatically?
        attrs.authors.forEach((author) => {
            authors.push(users.find(author.id));
        });

        attrs.authors = authors;

        attrs.updatedAt = moment.utc().toDate();

        return post.update(attrs);
    });

    server.del('/posts/:id/');
}
