import Mirage from 'ember-cli-mirage';
import {isBlank} from 'ember-utils';
import {paginatedResponse} from '../utils';

export default function mockPosts(server) {
    server.post('/posts/', function (db, request) {
        let [attrs] = JSON.parse(request.requestBody).posts;
        let post;

        if (isBlank(attrs.slug) && !isBlank(attrs.title)) {
            attrs.slug = attrs.title.dasherize();
        }

        // NOTE: this does not use the post factory to fill in blank fields
        post = db.posts.insert(attrs);

        return {
            posts: [post]
        };
    });

    server.get('/posts/', function (db, request) {
        // TODO: handle status/staticPages/author params
        let response = paginatedResponse('posts', db.posts, request);
        return response;
    });

    server.get('/posts/:id/', function (db, request) {
        let {id} = request.params;
        let post = db.posts.find(id);

        if (!post) {
            return new Mirage.Response(404, {}, {
                errors: [{
                    errorType: 'NotFoundError',
                    message: 'Post not found.'
                }]
            });
        } else {
            return {posts: [post]};
        }
    });

    server.put('/posts/:id/', function (db, request) {
        let {id} = request.params;
        let [attrs] = JSON.parse(request.requestBody).posts;
        delete attrs.id;

        let post = db.posts.update(id, attrs);

        return {
            posts: [post]
        };
    });

    server.del('/posts/:id/', function (db, request) {
        db.posts.remove(request.params.id);

        return new Mirage.Response(204, {}, {});
    });
}
