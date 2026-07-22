import {paginatedResponse} from '../utils';

export default function mockOffers(server) {
    server.post('/offers/');

    server.get('/offers/', paginatedResponse('offers'));

    server.get('/offers/:id/', function ({offers}, {params}) {
        let {id} = params;
        let tier = offers.find(id);

        return tier || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Offer not found.'
            }]
        });
    });

    server.put('/offers/:id/');
}
