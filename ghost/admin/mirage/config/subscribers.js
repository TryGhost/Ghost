/* eslint-disable camelcase */
import {Response} from 'ember-cli-mirage';
import {paginatedResponse} from '../utils';

export default function mockSubscribers(server) {
    server.get('/subscribers/', paginatedResponse('subscribers'));

    server.post('/subscribers/', function ({subscribers}) {
        let attrs = this.normalizedRequestAttrs();
        let subscriber = subscribers.findBy({email: attrs.email});

        if (subscriber) {
            return new Response(422, {}, {
                errors: [{
                    errorType: 'ValidationError',
                    message: 'Email already exists.',
                    property: 'email'
                }]
            });
        } else {
            attrs.createdAt = new Date();
            attrs.createdBy = 0;

            return subscribers.create(attrs);
        }
    });

    server.put('/subscribers/:id/');

    server.post('/subscribers/csv/', function () {
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

    server.del('/subscribers/:id/');
}
