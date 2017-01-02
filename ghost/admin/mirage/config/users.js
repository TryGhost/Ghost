export default function mockUsers(server) {
    // /users/me = Always return the user with ID=1
    server.get('/users/me/', function ({users}) {
        return users.find(1);
    });

    server.get('/users/');

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

            return users.find(id).update(attrs);
        }
    });

    server.del('/users/:id/');
}
