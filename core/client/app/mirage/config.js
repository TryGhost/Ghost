import Ember from 'ember';

const {isBlank} = Ember;

function paginatedResponse(modelName, allModels, request) {
    const page = +request.queryParams.page || 1;
    let limit = request.queryParams.limit || 15;
    let pages, models, next, prev;

    if (limit === 'all') {
        models = allModels;
        pages = 1;
    } else {
        limit = +limit;

        let start = (page - 1) * limit,
            end = start + limit;

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
                page: page,
                limit: limit,
                pages: pages,
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

    /* Notifications -------------------------------------------------------- */

    this.get('/notifications/', 'notifications');

    /* Posts ---------------------------------------------------------------- */

    this.post('/posts/', function (db, request) {
        const [attrs] = JSON.parse(request.requestBody).posts;
        let post;

        if (isBlank(attrs.slug) && !isBlank(attrs.title)) {
            attrs.slug = attrs.title.dasherize();
        }

        post = db.posts.insert(attrs);

        return {
            posts: [post]
        };
    });

    /* Settings ------------------------------------------------------------- */

    this.get('/settings/', function (db, request) {
        const filters = request.queryParams.type.split(','),
              settings = [];

        filters.forEach(filter => {
            settings.pushObjects(db.settings.where({type: filter}));
        });

        return {
            meta: {
                filters: {
                    type: request.queryParams.type
                }
            },
            settings: settings
        };
    });

    this.put('/settings/', function (db, request) {
        const newSettings = JSON.parse(request.requestBody);

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
                {slug: request.params.slug.dasherize}
            ]
        };
    });

    /* Tags ----------------------------------------------------------------- */

    this.post('/tags/', function (db, request) {
        const [attrs] = JSON.parse(request.requestBody).tags;
        let tag;

        if (isBlank(attrs.slug) && !isBlank(attrs.name)) {
            attrs.slug = attrs.name.dasherize();
        }

        tag = db.tags.insert(attrs);

        return {
            tag: tag
        };
    });

    this.get('/tags/', function (db, request) {
        const response = paginatedResponse('tags', db.tags, request);
        // TODO: remove post_count unless requested?
        return response;
    });

    this.get('/tags/slug/:slug/', function (db, request) {
        const [tag] = db.tags.where({slug: request.params.slug});

        // TODO: remove post_count unless requested?

        return {
            tag: tag
        };
    });

    this.put('/tags/:id/', function (db, request) {
        const id = request.params.id,
              [attrs] = JSON.parse(request.requestBody).tags,
              record = db.tags.update(id, attrs);

        return {
            tag: record
        };
    });

    this.del('/tags/:id/', 'tag');

    /* Users ---------------------------------------------------------------- */

    // /users/me = Always return the user with ID=1
    this.get('/users/me', function (db) {
        return {
            users: [db.users.find(1)]
        };
    });

    this.get('/users/', 'users');
}

/*
You can optionally export a config that is only loaded during tests
export function testConfig() {

}
*/
