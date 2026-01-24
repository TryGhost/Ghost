import {describe, expect, it} from 'vitest';
import {createStaffAuthService} from './staff-auth.service.js';
import type {StaffRepository} from '../repo/staff.repo.js';
import {hashPassword} from '../../../platform/auth/passwords.js';
import {HttpError} from '../../../platform/http/errors.js';
import type {StaffRecord, StaffSessionRecord} from '../schema/staff.schema.js';

const createRepository = (staff: StaffRecord): StaffRepository => {
    let sessions: StaffSessionRecord[] = [];

    return {
        getStaffByEmail: async (email) => (email === staff.email ? staff : null),
        getStaffById: async (id) => (id === staff.id ? staff : null),
        createSession: async (session) => {
            const record: StaffSessionRecord = {
                ...session,
                revokedAt: null
            };
            sessions = [...sessions, record];
            return record;
        },
        getSession: async (id) => sessions.find((session) => session.id === id) ?? null,
        revokeSession: async () => undefined,
        createResetToken: async () => {
            throw new Error('Not implemented');
        }
    };
};

describe('staff auth service', () => {
    it('logs in staff and returns a session', async () => {
        const staff: StaffRecord = {
            id: 'staff-1',
            email: 'jamie@example.com',
            name: 'Jamie',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const repository = createRepository(staff);
        const service = createStaffAuthService(repository);

        const result = await service.login({email: staff.email, password: 'password-123'}, '127.0.0.1');

        expect(result.staff.email).toBe(staff.email);
        expect(result.session.staffId).toBe(staff.id);
    });

    it('rate limits repeated failures', async () => {
        const staff: StaffRecord = {
            id: 'staff-2',
            email: 'casey@example.com',
            name: 'Casey',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const repository = createRepository(staff);
        const service = createStaffAuthService(repository);

        let rateLimited = false;

        for (let i = 0; i < 6; i += 1) {
            try {
                await service.login({email: staff.email, password: 'bad-password'}, '127.0.0.2');
            } catch (error) {
                if (error instanceof HttpError && error.code === 'rate_limited') {
                    rateLimited = true;
                    break;
                }
            }
        }

        expect(rateLimited).toBe(true);
    });
});
