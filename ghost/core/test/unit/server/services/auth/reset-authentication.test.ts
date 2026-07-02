import assert from 'node:assert/strict';
import resetAuthentication from '../../../../../core/server/services/auth/reset-authentication';
import {AutoFillingMap} from '../../../../../core/server/lib/auto-filling-map';
import type {ActionEntry, RequestContext} from '../../../../../core/server/services/actions';
import type {InternalApiKey, InternalIntegrationSlug} from '../../../../../core/server/services/internal-keys';

type TxCallback = (_tx: object) => Promise<unknown>;

const USER: RequestContext = {actor: {id: 'user-1', type: 'user'}};

/**
 * In-memory pretend of the auth-domain modules. We pass it as overrides so
 * the test exercises the real orchestration body but observes outcomes
 * through state we control. The audit is observed through an injected logAction
 * shim that collects the domain entries — never the actions table.
 */
function buildAuthDomain({apiKeysToRotate, usersToLock, currentKey}: {apiKeysToRotate: number; usersToLock: number; currentKey: {id: string; secret: string}}) {
    const recorded = {
        entries: [] as ActionEntry[],
        sessionsDeleted: false,
        cacheCleared: false,
        committed: false
    };

    const models = {
        Base: {
            transaction: async (cb: TxCallback) => {
                const result = await cb({label: 'tx'});
                recorded.committed = true;
                return result;
            }
        },
        ApiKey: {
            refreshAllSecrets: async () => ({count: apiKeysToRotate})
        }
    };

    const logAction = async (entry: ActionEntry) => {
        recorded.entries.push(entry);
    };

    const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
        (slug) => {
            throw new Error(`Test internalKeys not seeded for slug ${slug}`);
        }
    );
    internalKeys.set('ghost-scheduler', Promise.resolve(currentKey));
    const originalClear = internalKeys.clear.bind(internalKeys);
    internalKeys.clear = () => {
        recorded.cacheCleared = true;
        originalClear();
    };

    const deleteAllSessions = async () => {
        recorded.sessionsDeleted = true;
    };

    const userService = {lockAll: async () => ({count: usersToLock})};

    return {models, logAction, internalKeys, deleteAllSessions, userService, recorded};
}

describe('resetAuthentication', function () {
    it('rotates keys, locks users, records an audit action post-commit, returns counts', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 4, usersToLock: 3, currentKey: {id: 'k', secret: 'old'}});

        const result = await resetAuthentication(USER, {
            schedulerAdapter: {rescheduleAll: async () => {}},
            userService: env.userService,
            options: {},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions,
            logAction: env.logAction
        });

        assert.deepEqual(result, {apiKeysRotated: 4, usersLocked: 3});
        assert.equal(env.recorded.committed, true);
        assert.equal(env.recorded.entries.length, 1);
        assert.deepEqual(env.recorded.entries[0], {
            event: 'edited',
            resourceType: 'security_action',
            resourceId: null,
            actionName: 'reset_authentication',
            actor: {id: 'user-1', type: 'user'}
        });
    });

    it('asks the scheduler adapter to reschedule with the pre-rotation key', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 1, usersToLock: 1, currentKey: {id: 'k', secret: 'pre-rotation'}});
        let observed: {id: string; secret: string} | undefined;

        await resetAuthentication(USER, {
            schedulerAdapter: {rescheduleAll: async (opts) => {
                observed = opts.previousKey;
            }},
            userService: env.userService,
            options: {},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions,
            logAction: env.logAction
        });

        assert.deepEqual(observed, {id: 'k', secret: 'pre-rotation'});
    });

    it('records nothing for an actor-less (internal) context', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 1, usersToLock: 0, currentKey: {id: 'k', secret: 's'}});

        await resetAuthentication({actor: null}, {
            schedulerAdapter: {rescheduleAll: async () => {}},
            userService: env.userService,
            options: {},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions,
            logAction: env.logAction
        });

        assert.equal(env.recorded.entries.length, 0);
    });

    it('rolls back rotation and skips sessions + reschedule + audit when lock fails', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 2, usersToLock: 0, currentKey: {id: 'k', secret: 's'}});
        let rescheduleCalled = false;

        await assert.rejects(
            resetAuthentication(USER, {
                schedulerAdapter: {rescheduleAll: async () => {
                    rescheduleCalled = true;
                }},
                userService: {lockAll: async () => {
                    throw new Error('lock failed');
                }},
                options: {},
                models: env.models,
                internalKeys: env.internalKeys,
                deleteAllSessions: env.deleteAllSessions,
                logAction: env.logAction
            }),
            /lock failed/
        );

        assert.equal(env.recorded.entries.length, 0, 'no audit recorded on rollback');
        assert.equal(env.recorded.sessionsDeleted, false, 'sessions are not wiped on rollback');
        assert.equal(env.recorded.cacheCleared, false, 'internal-keys cache not cleared on rollback');
        assert.equal(rescheduleCalled, false, 'adapter is not asked to reschedule on rollback');
    });

    it('wipes sessions before asking the adapter to reschedule', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 1, usersToLock: 1, currentKey: {id: 'k', secret: 's'}});
        let sessionsWipedBeforeReschedule = false;

        await resetAuthentication(USER, {
            schedulerAdapter: {rescheduleAll: async () => {
                sessionsWipedBeforeReschedule = env.recorded.sessionsDeleted;
            }},
            userService: env.userService,
            options: {},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions,
            logAction: env.logAction
        });

        assert.equal(sessionsWipedBeforeReschedule, true);
    });
});
