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
        let filter = queryParams.filter || '';

        // author search e.g. `(name:~'John',slug:~'John',email:~'John')` - all
        // three fields use the same term, so extract it from the name clause
        // (unescaping NQL-escaped single quotes) and match any of the fields
        let searchFilter = filter.match(/name:~'((?:\\.|[^'\\])*)'/);
        let searchTerm = searchFilter ? searchFilter[1].replace(/\\'/g, '\'').toLowerCase() : null;

        // NOTE: this is naive and only set up to work with queries that are
        // actually used - if you use a different filter in the app, add it here!
        let collection = users.where(function (user) {
            let statusMatch = true;
            let searchMatch = true;

            if (filter === 'status:-inactive') {
                statusMatch = user.status !== 'inactive';
            } else if (filter === 'status:inactive') {
                statusMatch = user.status === 'inactive';
            } else if (queryParams.status && queryParams.status !== 'all') {
                statusMatch = user.status === queryParams.status;
            }

            if (searchTerm !== null) {
                searchMatch = ['name', 'slug', 'email'].some((field) => {
                    return (user[field] || '').toLowerCase().includes(searchTerm);
                });
            }

            return statusMatch && searchMatch;
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
