import {paginatedResponse} from '../utils';

export default function mockNewsletters(server) {
    server.post('/newsletters/');
    server.get('/newsletters/', paginatedResponse('newsletters'));
    server.get('/newsletters/:id/');
    server.put('/newsletters/:id/');
}
