import {Hono} from 'hono';
import type {StaffAuthService} from './service/staff-auth.service.js';
import {createStaffHandlers} from './handlers/staff.handlers.js';

export const createIdentityRouter = (service: StaffAuthService) => {
    const router = new Hono();
    const handlers = createStaffHandlers(service);

    router.post('/login', handlers.login);
    router.get('/me', handlers.me);

    return router;
};
