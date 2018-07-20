import moment from 'moment';
import {Response} from 'ember-cli-mirage';
import {dasherize} from '@ember/string';
import {isArray} from '@ember/array';
import {isBlank, isEmpty} from '@ember/utils';
import {paginateModelCollection} from '../utils';

function normalizeBooleanParams(arr) {
    if (!isArray(arr)) {
        return arr;
    }

    return arr.map((i) => {
        if (i === 'true') {
            return true;
        } else if (i === 'false') {
            return false;
        } else {
            return i;
        }
    });
}

// TODO: use GQL to parse filter string?
function extractFilterParam(param, filter) {
    let filterRegex = new RegExp(`${param}:(.*?)(?:\\+|$)`);
    let match;

    let [, result] = filter.match(filterRegex) || [];
    if (result.startsWith('[')) {
        match = result.replace(/^\[|\]$/g, '').split(',');
    } else if (result) {
        match = [result];
    }

    return normalizeBooleanParams(match);
}

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

    // TODO: handle authors filter
    server.get('/posts/', function ({posts}, {queryParams}) {
        let {filter, page, limit} = queryParams;

        page = +page || 1;
        limit = +limit || 15;

        let statusFilter = extractFilterParam('status', filter);
        let pageFilter = extractFilterParam('page', filter);

        let collection = posts.all().filter((post) => {
            let matchesStatus = true;
            let matchesPage = true;

            if (!isEmpty(statusFilter)) {
                matchesStatus = statusFilter.includes(post.status);
            }

            if (!isEmpty(pageFilter)) {
                matchesPage = pageFilter.includes(post.page);
            }

            return matchesStatus && matchesPage;
        });

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
