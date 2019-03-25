import {paginatedResponse} from '../utils';

export default function mockMembers(server) {
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

    server.del('/members/:id/');
}
