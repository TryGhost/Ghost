import {Response} from 'ember-cli-mirage';
import {dasherize} from '@ember/string';
import {isBlank} from '@ember/utils';
import {paginateModelArray} from '../utils';

export default function mockPosts(server) {
    server.post('/posts', function ({posts}) {
        let attrs = this.normalizedRequestAttrs();

        // mirage expects `author` to be a reference but we only have an ID
        attrs.authorId = attrs.author;
        delete attrs.author;

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
        let models;

        if (status && status !== 'all') {
            query.status = status;
        }

        if (staticPages === 'false') {
            query.page = false;
        }

        if (staticPages === 'true') {
            query.page = true;
        }

        models = posts.where(query).models;

        return paginateModelArray('posts', models, page, limit);
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

    // Handle embedded author in post
    server.put('/posts/:id/', function ({posts}, request) {
        let post = this.normalizedRequestAttrs();
        let {author} = post;
        delete post.author;

        let savedPost = posts.find(request.params.id).update(post);
        savedPost.authorId = author;
        savedPost.save();

        return savedPost;
    });

    server.del('/posts/:id/');
}
