import {paginatedResponse} from '../utils';

export default function mockOffers(server) {
    server.get('/offers/', paginatedResponse('offers'));
}
