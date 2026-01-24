import {randomUUID} from 'node:crypto';
import type {LoginRequest, StaffResponse, StaffSessionResponse} from './contracts.js';
import type {StaffRepository} from './repo.js';
import {verifyPassword} from '../../platform/auth/passwords.js';
import {createRateLimiter} from '../../platform/auth/rate-limiter.js';
import {HttpError} from '../../platform/http/errors.js';

export type StaffAuthService = {
    login: (input: LoginRequest, ipAddress: string) => Promise<{staff: StaffResponse; session: StaffSessionResponse}>;
    getStaffBySession: (sessionId: string) => Promise<StaffResponse>;
};

const loginLimiter = createRateLimiter(5, 5 * 60 * 1000);

const mapStaff = (record: {
    id: string;
    email: string;
    name: string;
    status: string;
}) => ({
    id: record.id,
    email: record.email,
    name: record.name,
    status: record.status === 'suspended' ? 'suspended' : 'active'
} as const);

export const createStaffAuthService = (repository: StaffRepository): StaffAuthService => {
    const login = async (input: LoginRequest, ipAddress: string) => {
        const key = `${input.email}:${ipAddress}`;
        const rate = loginLimiter.check(key);
        if (!rate.allowed) {
            throw new HttpError(429, 'rate_limited', 'Too many login attempts');
        }

        const staff = await repository.getStaffByEmail(input.email);
        if (!staff || !verifyPassword(input.password, staff.passwordHash)) {
            throw new HttpError(401, 'invalid_credentials', 'Invalid email or password');
        }

        if (staff.status !== 'active') {
            throw new HttpError(403, 'staff_suspended', 'Staff account is suspended');
        }

        loginLimiter.reset(key);

        const now = Date.now();
        const session = await repository.createSession({
            id: randomUUID(),
            staffId: staff.id,
            createdAt: now,
            expiresAt: now + 1000 * 60 * 60 * 24 * 7
        });

        return {
            staff: mapStaff(staff),
            session: {
                id: session.id,
                staffId: session.staffId,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt
            }
        };
    };

    const getStaffBySession = async (sessionId: string) => {
        const session = await repository.getSession(sessionId);
        if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        const staff = await repository.getStaffById(session.staffId);
        if (!staff) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        return mapStaff(staff);
    };

    return {
        login,
        getStaffBySession
    };
};
