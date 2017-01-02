import {Response} from 'ember-cli-mirage';
import {isBlank} from 'ember-utils';
import {paginatedResponse} from '../utils';
import {dasherize} from 'ember-string';

export default function mockPosts(server) {
    server.post('/posts', function ({posts}) {
        let attrs = this.normalizedRequestAttrs();

        if (isBlank(attrs.slug) && !isBlank(attrs.title)) {
            attrs.slug = dasherize(attrs.title);
        }

        // NOTE: this does not use the post factory to fill in blank fields
        return posts.create(attrs);
    });

    // TODO: handle status/staticPages/author params
    server.get('/posts/', paginatedResponse('posts'));

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

    server.put('/posts/:id/');

    server.del('/posts/:id/');
}
