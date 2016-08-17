import Mirage from 'ember-cli-mirage';
import {isBlank} from 'ember-utils';
import {paginatedResponse} from '../utils';

export default function mockTags(server) {
    server.post('/tags/', function (db, request) {
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

    server.get('/tags/', function (db, request) {
        let response = paginatedResponse('tags', db.tags, request);
        // TODO: remove post_count unless requested?
        return response;
    });

    server.get('/tags/slug/:slug/', function (db, request) {
        let [tag] = db.tags.where({slug: request.params.slug});

        // TODO: remove post_count unless requested?

        return {
            tag
        };
    });

    server.put('/tags/:id/', function (db, request) {
        let {id} = request.params;
        let [attrs] = JSON.parse(request.requestBody).tags;
        let record = db.tags.update(id, attrs);

        return {
            tag: record
        };
    });

    server.del('/tags/:id/', function (db, request) {
        db.tags.remove(request.params.id);

        return new Mirage.Response(204, {}, {});
    });
}
