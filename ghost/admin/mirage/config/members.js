import {paginatedResponse} from '../utils';

export default function mockMembers(server) {
    server.post('/members/', function ({members}) {
        let attrs = this.normalizedRequestAttrs();

        return members.create(Object.assign({}, attrs, {id: 99}));
    });

    server.get('/members/', paginatedResponse('members'));

    server.get('/members/:id/', function ({members}, {params}) {
        let {id} = params;
        let member = members.find(id);

        return member || new Response(404, {}, {
            errors: [{
                type: 'NotFoundError',
                message: 'Member not found.'
            }]
        });
    });

    server.put('/members/:id/');

    server.del('/members/:id/');
}
