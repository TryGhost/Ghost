import {Response} from 'miragejs';
import {paginateModelCollection} from '../utils';

export default function mockUsers(server) {
    // /users/me = Always return the user with ID=1
    server.get('/users/me/', function ({users}) {
        let user = users.find(1);

        if (user) {
            return user;
        } else {
            return new Response(404, {}, {errors: [
                {message: 'Not found', type: 'NotFoundError'}
            ]});
        }
    });

    server.get('/users/', function ({users}, {queryParams}) {
        let page = +queryParams.page || 1;

        // NOTE: this is naive and only set up to work with queries that are
        // actually used - if you use a different filter in the app, add it here!
        let collection = users.where(function (user) {
            let statusMatch = true;

            if (queryParams.filter === 'status:-inactive') {
                statusMatch = user.status !== 'inactive';
            } else if (queryParams.filter === 'status:inactive') {
                statusMatch = user.status === 'inactive';
            } else if (queryParams.status && queryParams.status !== 'all') {
                statusMatch = user.status === queryParams.status;
            }

            return statusMatch;
        });

        return paginateModelCollection('users', collection, page, queryParams.limit);
    });

    server.get('/users/slug/:slug/', function ({users}, {params, queryParams}) {
        let user = users.findBy({slug: params.slug});
        user.postCount = queryParams.include.match(/count\.posts/);
        return user;
    });

    server.get('/users/:id', function ({users}, {params, queryParams}) {
        let user = users.find(params.id);
        user.postCount = queryParams.include.match(/count\.posts/);
        return user;
    });

    server.put('/users/:id/', function ({users}, {params}) {
        let {id} = params;

        if (id === 'password') {
            return {
                password: [{message: 'Password changed successfully.'}]
            };
        } else {
            let attrs = this.normalizedRequestAttrs();

            // TODO: why is our custom serializer causing .update to throw
            // children.update is not a function?
            // https://github.com/samselikoff/ember-cli-mirage/issues/964
            delete attrs.roles;

            return users.find(id).update(attrs);
        }
    });

    server.del('/users/:id/');

    // Dummy Personal Token to pass tests
    server.get('/users/me/token', () => ({
        apiKey: {
            id: '1',
            secret: '2'
        }
    }));
}
