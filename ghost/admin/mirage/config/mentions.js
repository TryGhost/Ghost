import {paginatedResponse} from '../utils';

export default function mockMentions(server) {
    server.get('/mentions/', paginatedResponse('mentions'));
}
