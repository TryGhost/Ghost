import {randomUUID} from 'node:crypto';
import type {
    MagicLinkRequest,
    MagicLinkResponse,
    MemberSessionVerifyRequest,
    MemberSessionVerifyResponse,
    MagicLinkVerifyRequest,
    MagicLinkVerifyResponse,
    MemberResponse,
    MemberSessionResponse
} from './contracts.js';
import type {MemberRepository} from './repo.js';
import {createRateLimiter} from '../../platform/auth/rate-limiter.js';
import {HttpError} from '../../platform/http/errors.js';

export type SignupPolicy = 'open' | 'invite-only' | 'paid-only' | 'none';

export type MemberAuthService = {
    requestMagicLink: (input: MagicLinkRequest, ipAddress: string) => Promise<MagicLinkResponse & {token?: string}>;
    verifyMagicLink: (input: MagicLinkVerifyRequest) => Promise<MagicLinkVerifyResponse>;
    verifySession: (input: MemberSessionVerifyRequest) => Promise<MemberSessionVerifyResponse>;
};

const magicLinkLimiter = createRateLimiter(10, 5 * 60 * 1000);
const magicLinkTtlMs = 1000 * 60 * 30;
const memberSessionTtlMs = 1000 * 60 * 60 * 24 * 7;

const toMemberResponse = (member: {
    id: string;
    email: string;
    status: string;
    createdAt: number;
    updatedAt: number;
}): MemberResponse => ({
    id: member.id,
    email: member.email,
    status: member.status === 'paid' ? 'paid' : 'free',
    createdAt: member.createdAt,
    updatedAt: member.updatedAt
});

const toMemberSessionResponse = (session: {
    id: string;
    memberId: string;
    createdAt: number;
    expiresAt: number;
}): MemberSessionResponse => ({
    id: session.id,
    memberId: session.memberId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
});

export const createMemberAuthService = (repository: MemberRepository, signupPolicy: SignupPolicy): MemberAuthService => {
    const requestMagicLink = async (input: MagicLinkRequest, ipAddress: string) => {
        const rate = magicLinkLimiter.check(`${input.email}:${ipAddress}`);
        if (!rate.allowed) {
            throw new HttpError(429, 'rate_limited', 'Too many requests');
        }

        const member = await repository.getMemberByEmail(input.email);
        if (!member && signupPolicy !== 'open') {
            throw new HttpError(403, 'signup_not_allowed', 'Signup is not allowed');
        }

        const now = Date.now();
        const authToken = await repository.createAuthToken({
            id: randomUUID(),
            memberId: member?.id ?? null,
            email: input.email,
            token: randomUUID(),
            createdAt: now,
            expiresAt: now + magicLinkTtlMs,
            usedAt: null
        });

        return {issued: true, token: authToken.token};
    };

    const verifyMagicLink = async (input: MagicLinkVerifyRequest) => {
        const token = await repository.getAuthTokenByToken(input.token);
        if (!token || token.usedAt || token.expiresAt <= Date.now()) {
            throw new HttpError(400, 'invalid_magic_link', 'Magic link is invalid or expired');
        }

        let member = token.memberId ? await repository.getMemberById(token.memberId) : null;
        if (!member) {
            const now = Date.now();
            member = await repository.createMember({
                id: randomUUID(),
                email: token.email,
                status: 'free',
                createdAt: now,
                updatedAt: now
            });
            await repository.createAuthEvent({
                id: randomUUID(),
                memberId: member.id,
                action: 'signup',
                createdAt: now
            });
        } else {
            await repository.createAuthEvent({
                id: randomUUID(),
                memberId: member.id,
                action: 'login',
                createdAt: Date.now()
            });
        }

        const now = Date.now();
        const session = await repository.createSession({
            id: randomUUID(),
            memberId: member.id,
            createdAt: now,
            expiresAt: now + memberSessionTtlMs,
            revokedAt: null
        });

        await repository.markAuthTokenUsed(token.id, now);

        return {
            member: toMemberResponse(member),
            session: toMemberSessionResponse(session)
        };
    };

    const verifySession = async (input: MemberSessionVerifyRequest) => {
        const session = await repository.getSessionById(input.sessionId);
        if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        const member = await repository.getMemberById(session.memberId);
        if (!member) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        if (input.requiresPaid && member.status !== 'paid') {
            throw new HttpError(403, 'paid_required', 'Paid membership required');
        }

        return {member: toMemberResponse(member)};
    };

    return {
        requestMagicLink,
        verifyMagicLink,
        verifySession
    };
};
