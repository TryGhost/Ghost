/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Mirage from 'ember-cli-mirage';
import {paginatedResponse} from '../utils';

export default function mockSubscribers(server) {
    server.get('/subscribers/', function (db, request) {
        let response = paginatedResponse('subscribers', db.subscribers, request);
        return response;
    });

    server.post('/subscribers/', function (db, request) {
        let [attrs] = JSON.parse(request.requestBody).subscribers;
        let [subscriber] = db.subscribers.where({email: attrs.email});

        if (subscriber) {
            return new Mirage.Response(422, {}, {
                errors: [{
                    errorType: 'ValidationError',
                    message: 'Email already exists.',
                    property: 'email'
                }]
            });
        } else {
            attrs.created_at = new Date();
            attrs.created_by = 0;

            subscriber = db.subscribers.insert(attrs);

            return {
                subscriber
            };
        }
    });

    server.put('/subscribers/:id/', function (db, request) {
        let {id} = request.params;
        let [attrs] = JSON.parse(request.requestBody).subscribers;
        let subscriber = db.subscribers.update(id, attrs);

        return {
            subscriber
        };
    });

    server.del('/subscribers/:id/', function (db, request) {
        db.subscribers.remove(request.params.id);

        return new Mirage.Response(204, {}, {});
    });

    server.post('/subscribers/csv/', function (/*db, request*/) {
        // NB: we get a raw FormData object with no way to inspect it in Chrome
        // until version 50 adds the additional read methods
        // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility

        server.createList('subscriber', 50);

        return {
            meta: {
                stats: {
                    imported: 50,
                    duplicates: 3,
                    invalid: 2
                }
            }
        };
    });
}
