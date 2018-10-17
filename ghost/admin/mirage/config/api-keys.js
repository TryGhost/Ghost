import {paginatedResponse} from '../utils';

export default function mockApiKeys(server) {
    server.get('/api-keys/', paginatedResponse('api-keys'));
    server.post('/api-keys/');
    server.put('/api-keys/:id/');
    server.del('/api-keys/:id/');
}
