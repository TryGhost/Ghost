import {describe, expect, it} from 'vitest';
import {createMemberAuthService} from './service.js';
import type {MemberRepository} from './repo.js';
import type {
    MemberAuthEventRecord,
    MemberAuthTokenRecord,
    MemberRecord,
    MemberSessionRecord
} from './db.js';
import {HttpError} from '../../platform/http/errors.js';

const createRepository = (): MemberRepository & {state: () => {
    members: MemberRecord[];
    tokens: MemberAuthTokenRecord[];
    sessions: MemberSessionRecord[];
    events: MemberAuthEventRecord[];
}} => {
    const members: MemberRecord[] = [];
    const tokens: MemberAuthTokenRecord[] = [];
    const sessions: MemberSessionRecord[] = [];
    const events: MemberAuthEventRecord[] = [];

    return {
        getMemberByEmail: async (email) => members.find((member) => member.email === email) ?? null,
        listMembers: async () => members,
        countMembers: async () => ({total: members.length, free: members.filter((m) => m.status === 'free').length, paid: members.filter((m) => m.status === 'paid').length}),
        getMemberById: async (id) => members.find((member) => member.id === id) ?? null,
        createMember: async (member) => {
            const record = member as MemberRecord;
            members.push(record);
            return record;
        },
        createAuthToken: async (token) => {
            const record = token as MemberAuthTokenRecord;
            tokens.push(record);
            return record;
        },
        getAuthTokenByToken: async (token) => tokens.find((record) => record.token === token) ?? null,
        markAuthTokenUsed: async (id, usedAt) => {
            const index = tokens.findIndex((record) => record.id === id);
            const existing = tokens[index];
            if (!existing) {
                return;
            }
            tokens[index] = {...existing, usedAt};
        },
        createSession: async (session) => {
            const record: MemberSessionRecord = {
                ...session,
                revokedAt: session.revokedAt ?? null
            };
            sessions.push(record);
            return record;
        },
        getSessionById: async (id) => sessions.find((session) => session.id === id) ?? null,
        createAuthEvent: async (event) => {
            const record = event as MemberAuthEventRecord;
            events.push(record);
            return record;
        },
        cleanupAuthTokens: async () => 0,
        state: () => ({members, tokens, sessions, events})
    };
};

describe('member auth service', () => {
    it('issues magic links when signup is open', async () => {
        const repository = createRepository();
        const service = createMemberAuthService(repository, 'open');

        const result = await service.requestMagicLink({email: 'member@example.com'}, '127.0.0.1');

        expect(result.issued).toBe(true);
        expect(result.token).toBeTruthy();
    });

    it('blocks magic links when signup is closed', async () => {
        const repository = createRepository();
        const service = createMemberAuthService(repository, 'invite-only');

        let error: HttpError | null = null;

        try {
            await service.requestMagicLink({email: 'member@example.com'}, '127.0.0.1');
        } catch (caught) {
            if (caught instanceof HttpError) {
                error = caught;
            }
        }

        expect(error?.status).toBe(403);
    });

    it('verifies magic links and creates sessions', async () => {
        const repository = createRepository();
        const service = createMemberAuthService(repository, 'open');

        const request = await service.requestMagicLink({email: 'member@example.com'}, '127.0.0.1');
        const token = request.token ?? '';

        const verified = await service.verifyMagicLink({token});

        const state = repository.state();

        expect(verified.member.email).toBe('member@example.com');
        expect(verified.session.memberId).toBe(verified.member.id);
        expect(state.sessions.length).toBe(1);
        expect(state.events.length).toBe(1);
    });

    it('verifies member sessions with paid checks', async () => {
        const repository = createRepository();
        const service = createMemberAuthService(repository, 'open');

        const now = Date.now();
        const member = await repository.createMember({
            id: 'member-1',
            email: 'paid@example.com',
            status: 'paid',
            createdAt: now,
            updatedAt: now
        });

        const session = await repository.createSession({
            id: 'session-1',
            memberId: member.id,
            createdAt: now,
            expiresAt: now + 1000,
            revokedAt: null
        });

        const result = await service.verifySession({sessionId: session.id, requiresPaid: true});

        expect(result.member.email).toBe(member.email);
    });
});
