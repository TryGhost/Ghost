import {paginatedResponse} from '../utils';

export default function mockMembers(server) {
    server.get('/members/', paginatedResponse('members'));
}
