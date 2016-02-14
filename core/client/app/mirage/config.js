/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import Mirage from 'ember-cli-mirage';

const {$, isBlank} = Ember;

function paginatedResponse(modelName, allModels, request) {
    let page = +request.queryParams.page || 1;
    let limit = request.queryParams.limit || 15;
    let pages, models, next, prev;

    allModels = allModels || [];

    if (limit === 'all') {
        models = allModels;
        pages = 1;
    } else {
        limit = +limit;

        let start = (page - 1) * limit;
        let end = start + limit;

        models = allModels.slice(start, end);
        pages = Math.ceil(allModels.length / limit);

        if (start > 0) {
            prev = page - 1;
        }

        if (end < allModels.length) {
            next = page + 1;
        }
    }

    return {
        meta: {
            pagination: {
                page,
                limit,
                pages,
                total: allModels.length,
                next: next || null,
                prev: prev || null
            }
        },
        [modelName]: models
    };
}

export default function () {
    // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
    this.namespace = 'ghost/api/v0.1';    // make this `api`, for example, if your API is namespaced
    // this.timing = 400;      // delay for each request, automatically set to 0 during testing

    /* Authentication ------------------------------------------------------- */

    this.post('/authentication/token', function () {
        return {
            access_token: '5JhTdKI7PpoZv4ROsFoERc6wCHALKFH5jxozwOOAErmUzWrFNARuH1q01TYTKeZkPW7FmV5MJ2fU00pg9sm4jtH3Z1LjCf8D6nNqLYCfFb2YEKyuvG7zHj4jZqSYVodN2YTCkcHv6k8oJ54QXzNTLIDMlCevkOebm5OjxGiJpafMxncm043q9u1QhdU9eee3zouGRMVVp8zkKVoo5zlGMi3zvS2XDpx7xsfk8hKHpUgd7EDDQxmMueifWv7hv6n',
            expires_in: 3600,
            refresh_token: 'XP13eDjwV5mxOcrq1jkIY9idhdvN3R1Br5vxYpYIub2P5Hdc8pdWMOGmwFyoUshiEB62JWHTl8H1kACJR18Z8aMXbnk5orG28br2kmVgtVZKqOSoiiWrQoeKTqrRV0t7ua8uY5HdDUaKpnYKyOdpagsSPn3WEj8op4vHctGL3svOWOjZhq6F2XeVPMR7YsbiwBE8fjT3VhTB3KRlBtWZd1rE0Qo2EtSplWyjGKv1liAEiL0ndQoLeeSOCH4rTP7',
            token_type: 'Bearer'
        };
    });

    this.post('/authentication/passwordreset', function (db, request) {
        // jscs:disable requireObjectDestructuring
        let {passwordreset} = $.deparam(request.requestBody);
        let email = passwordreset[0].email;
        // jscs:enable requireObjectDestructuring

        if (email === 'unknown@example.com') {
            return new Mirage.Response(404, {}, {
                errors: [
                    {
                        message: 'There is no user with that email address.',
                        errorType: 'NotFoundError'
                    }
                ]
            });
        } else {
            return {
                passwordreset: [
                    {message: 'Check your email for further instructions.'}
                ]
            };
        }
    });

    /* Download Count ------------------------------------------------------- */

    let downloadCount = 0;
    this.get('https://count.ghost.org/', function () {
        downloadCount++;
        return {
            count: downloadCount
        };
    });

    /* Notifications -------------------------------------------------------- */

    this.get('/notifications/', 'notifications');

    /* Posts ---------------------------------------------------------------- */

    this.post('/posts/', function (db, request) {
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

    this.get('/posts/', function (db, request) {
        // TODO: handle status/staticPages/author params
        let response = paginatedResponse('posts', db.posts, request);
        return response;
    });

    /* Roles ---------------------------------------------------------------- */

    this.get('/roles/', function (db, request) {
        if (request.queryParams.permissions === 'assign') {
            let roles = db.roles.find([1,2,3]);
            return {roles};
        }

        return {
            roles: db.roles
        };
    });

    /* Settings ------------------------------------------------------------- */

    this.get('/settings/', function (db, request) {
        let filters = request.queryParams.type.split(',');
        let settings = [];

        filters.forEach((filter) => {
            settings.pushObjects(db.settings.where({type: filter}));
        });

        return {
            settings,
            meta: {
                filters: {
                    type: request.queryParams.type
                }
            }
        };
    });

    this.put('/settings/', function (db, request) {
        let newSettings = JSON.parse(request.requestBody).settings;

        db.settings.remove();
        db.settings.insert(newSettings);

        return {
            meta: {},
            settings: db.settings
        };
    });

    /* Slugs ---------------------------------------------------------------- */

    this.get('/slugs/post/:slug/', function (db, request) {
        return {
            slugs: [
                {slug: Ember.String.dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });

    this.get('/slugs/user/:slug/', function (db, request) {
        return {
            slugs: [
                {slug: Ember.String.dasherize(decodeURIComponent(request.params.slug))}
            ]
        };
    });

    /* Setup ---------------------------------------------------------------- */

    this.post('/authentication/setup', function (db, request) {
        let [attrs] = $.deparam(request.requestBody).setup;
        let [role] = db.roles.where({name: 'Owner'});
        let user;

        // create owner role unless already exists
        if (!role) {
            role = db.roles.insert({name: 'Owner'});
        }
        attrs.roles = [role];

        if (!isBlank(attrs.email)) {
            attrs.slug = attrs.email.split('@')[0].dasherize();
        }

        // NOTE: this does not use the user factory to fill in blank fields
        user = db.users.insert(attrs);

        delete user.roles;

        return {
            users: [user]
        };
    });

    this.get('/authentication/setup/', function () {
        return {
            setup: [
                {status: true}
            ]
        };
    });

    /* Tags ----------------------------------------------------------------- */

    this.post('/tags/', function (db, request) {
        let [attrs] = JSON.parse(request.requestBody).tags;
        let tag;

        if (isBlank(attrs.slug) && !isBlank(attrs.name)) {
            attrs.slug = attrs.name.dasherize();
        }

        // NOTE: this does not use the tag factory to fill in blank fields
        tag = db.tags.insert(attrs);

        return {
            tag
        };
    });

    this.get('/tags/', function (db, request) {
        let response = paginatedResponse('tags', db.tags, request);
        // TODO: remove post_count unless requested?
        return response;
    });

    this.get('/tags/slug/:slug/', function (db, request) {
        let [tag] = db.tags.where({slug: request.params.slug});

        // TODO: remove post_count unless requested?

        return {
            tag
        };
    });

    this.put('/tags/:id/', function (db, request) {
        let {id} = request.params;
        let [attrs] = JSON.parse(request.requestBody).tags;
        let record = db.tags.update(id, attrs);

        return {
            tag: record
        };
    });

    this.del('/tags/:id/', 'tag');

    /* Users ---------------------------------------------------------------- */

    this.post('/users/', function (db, request) {
        let [attrs] = JSON.parse(request.requestBody).users;
        let user;

        if (!isBlank(attrs.email)) {
            attrs.slug = attrs.email.split('@')[0].dasherize();
        }

        // NOTE: this does not use the user factory to fill in blank fields
        user = db.users.insert(attrs);

        return {
            users: [user]
        };
    });

    // /users/me = Always return the user with ID=1
    this.get('/users/me', function (db) {
        return {
            users: [db.users.find(1)]
        };
    });

    this.get('/users/', 'users');

    this.get('/users/slug/:slug/', function (db, request) {
        let user = db.users.where({slug: request.params.slug});

        return {
            users: user
        };
    });

    this.del('/users/:id/', 'user');

    this.get('/users/:id', function (db, request) {
        return {
            users: [db.users.find(request.params.id)]
        };
    });
}

/*
You can optionally export a config that is only loaded during tests
export function testConfig() {

}
*/
