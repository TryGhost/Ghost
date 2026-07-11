import assert from 'node:assert/strict';
import resetAuthentication from '../../../../../core/server/services/auth/reset-authentication';
import {AutoFillingMap} from '../../../../../core/server/lib/auto-filling-map';
import type {InternalApiKey, InternalIntegrationSlug} from '../../../../../core/server/services/internal-keys';

interface ActionRow {
    event: string;
    resource_type: string;
    actor_id: string;
    context: {action_name: string; api_keys_rotated: number; users_locked: number};
}

type TxCallback = (_tx: object) => Promise<unknown>;

/**
 * In-memory pretend of the auth-domain modules. We pass it as overrides so
 * the test exercises the real orchestration body but observes outcomes
 * through state we control.
 */
function buildAuthDomain({apiKeysToRotate, usersToLock, currentKey}: {apiKeysToRotate: number; usersToLock: number; currentKey: {id: string; secret: string}}) {
    const recorded = {
        actions: [] as ActionRow[],
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
        },
        Action: {
            add: async (payload: ActionRow) => {
                recorded.actions.push(payload);
                return {};
            }
        }
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

    return {models, internalKeys, deleteAllSessions, userService, recorded};
}

describe('resetAuthentication', function () {
    it('rotates keys, locks users, writes audit row with counts, returns counts', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 4, usersToLock: 3, currentKey: {id: 'k', secret: 'old'}});
        const adapter = {rescheduleAll: async () => {}};

        const result = await resetAuthentication({
            schedulerAdapter: adapter,
            userService: env.userService,
            options: {context: {user: 'user-1'}},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions
        });

        assert.deepEqual(result, {apiKeysRotated: 4, usersLocked: 3});
        assert.equal(env.recorded.committed, true);
        assert.equal(env.recorded.actions.length, 1);
        assert.equal(env.recorded.actions[0].event, 'edited');
        assert.equal(env.recorded.actions[0].resource_type, 'security_action');
        assert.equal(env.recorded.actions[0].actor_id, 'user-1');
        assert.equal(env.recorded.actions[0].context.action_name, 'reset_authentication');
        assert.equal(env.recorded.actions[0].context.api_keys_rotated, 4);
        assert.equal(env.recorded.actions[0].context.users_locked, 3);
    });

    it('asks the scheduler adapter to reschedule with the pre-rotation key', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 1, usersToLock: 1, currentKey: {id: 'k', secret: 'pre-rotation'}});
        let observed: {id: string; secret: string} | undefined;

        await resetAuthentication({
            schedulerAdapter: {rescheduleAll: async (opts) => {
                observed = opts.previousKey;
            }},
            userService: env.userService,
            options: {context: {user: 'user-1'}},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions
        });

        assert.deepEqual(observed, {id: 'k', secret: 'pre-rotation'});
    });

    it('skips the audit row when no actor is in context', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 1, usersToLock: 0, currentKey: {id: 'k', secret: 's'}});

        await resetAuthentication({
            schedulerAdapter: {rescheduleAll: async () => {}},
            userService: env.userService,
            options: {},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions
        });

        assert.equal(env.recorded.actions.length, 0);
    });

    it('rolls back rotation and skips sessions + reschedule when lock fails', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 2, usersToLock: 0, currentKey: {id: 'k', secret: 's'}});
        let rescheduleCalled = false;

        await assert.rejects(
            resetAuthentication({
                schedulerAdapter: {rescheduleAll: async () => {
                    rescheduleCalled = true;
                }},
                userService: {lockAll: async () => {
                    throw new Error('lock failed');
                }},
                options: {context: {user: 'user-1'}},
                models: env.models,
                internalKeys: env.internalKeys,
                deleteAllSessions: env.deleteAllSessions
            }),
            /lock failed/
        );

        assert.equal(env.recorded.actions.length, 0, 'audit row not written on rollback');
        assert.equal(env.recorded.sessionsDeleted, false, 'sessions are not wiped on rollback');
        assert.equal(env.recorded.cacheCleared, false, 'internal-keys cache not cleared on rollback');
        assert.equal(rescheduleCalled, false, 'adapter is not asked to reschedule on rollback');
    });

    it('wipes sessions before asking the adapter to reschedule', async function () {
        const env = buildAuthDomain({apiKeysToRotate: 1, usersToLock: 1, currentKey: {id: 'k', secret: 's'}});
        let sessionsWipedBeforeReschedule = false;

        await resetAuthentication({
            schedulerAdapter: {rescheduleAll: async () => {
                sessionsWipedBeforeReschedule = env.recorded.sessionsDeleted;
            }},
            userService: env.userService,
            options: {context: {user: 'user-1'}},
            models: env.models,
            internalKeys: env.internalKeys,
            deleteAllSessions: env.deleteAllSessions
        });

        assert.equal(sessionsWipedBeforeReschedule, true);
    });
});
