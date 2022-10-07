import {paginatedResponse} from '../utils';

export default function mockLabels(server) {
    server.post('/labels/');
    server.get('/labels/', paginatedResponse('labels'));

    server.get('/labels/:id/', function ({labels}, {params}) {
        let {id} = params;
        let label = labels.find(id);

        return label || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Label not found.'
            }]
        });
    });

    server.put('/labels/:id/');

    server.del('/labels/:id/');
}
