import assert from 'node:assert/strict';
import createResetAuthentication from '../../../../../core/server/services/auth/reset-authentication';

interface RecordedAction {
    payload: Record<string, unknown>;
    options: Record<string, unknown>;
}

// eslint-disable-next-line no-unused-vars
type ActionRecorder = (action: RecordedAction) => void;
// eslint-disable-next-line no-unused-vars
type TxCallback = (txn: object) => Promise<unknown>;

function buildModels({rotated, locked, onAction}: {rotated: number; locked: number; onAction: ActionRecorder}) {
    let committed = false;
    return {
        Base: {
            transaction: async (cb: TxCallback) => {
                const result = await cb({label: 'tx'});
                committed = true;
                return result;
            }
        },
        ApiKey: {
            refreshAllSecrets: async () => ({count: rotated})
        },
        Action: {
            add: async (payload: Record<string, unknown>, options: Record<string, unknown>) => {
                onAction({payload, options});
                return {};
            }
        },
        _isCommitted: () => committed,
        _locked: locked
    };
}

describe('reset-authentication service', function () {
    it('rotates keys, locks users, writes audit, reschedules, and destroys sessions', async function () {
        const actions: RecordedAction[] = [];
        const calls: string[] = [];
        const models = buildModels({rotated: 4, locked: 3, onAction: a => actions.push(a)});

        const internalKeys = new Map([
            ['ghost-scheduler', Promise.resolve({id: 'kid', secret: 'old-secret'})]
        ]) as Map<'ghost-scheduler', Promise<{id: string; secret: string}>> & {clear: () => void};
        const originalClear = internalKeys.clear.bind(internalKeys);
        internalKeys.clear = () => {
            calls.push('internalKeys.clear');
            originalClear();
        };

        const reset = createResetAuthentication({
            models: models as unknown as Parameters<typeof createResetAuthentication>[0]['models'],
            internalKeys,
            postScheduling: {rescheduleAll: async (opts) => {
                calls.push(`postScheduling.rescheduleAll:${opts.previousKey?.secret}`);
            }},
            automations: {rescheduleAll: async (opts) => {
                calls.push(`automations.rescheduleAll:${opts.previousKey?.secret}`);
            }},
            giftService: {rescheduleAll: async (opts) => {
                calls.push(`giftService.rescheduleAll:${opts.previousKey?.secret}`);
            }},
            userService: {lockAll: async () => ({count: models._locked})},
            deleteAllSessions: async () => {
                calls.push('deleteAllSessions');
            }
        });

        const result = await reset({options: {context: {user: 'user-1'}}});

        assert.deepEqual(result, {apiKeysRotated: 4, usersLocked: 3});
        assert.equal(actions.length, 1, 'one audit row written');
        assert.equal(actions[0].payload.event, 'edited');
        assert.equal(actions[0].payload.resource_type, 'security_action');
        assert.equal(actions[0].payload.actor_id, 'user-1');
        assert.deepEqual(actions[0].payload.context, {
            action_name: 'reset_authentication',
            api_keys_rotated: 4,
            users_locked: 3
        });
        assert.ok(actions[0].options.transacting, 'audit row is written within the transaction');
        assert.equal(actions[0].options.autoRefresh, false);
        assert.equal(models._isCommitted(), true);

        // Sessions must be wiped before any reschedule has a chance to throw.
        const sessionIndex = calls.indexOf('deleteAllSessions');
        const reschedules = ['postScheduling.rescheduleAll:old-secret', 'automations.rescheduleAll:old-secret', 'giftService.rescheduleAll:old-secret'];
        assert.ok(calls.indexOf('internalKeys.clear') < sessionIndex, 'cache clear before session wipe');
        for (const r of reschedules) {
            assert.ok(calls.indexOf(r) > sessionIndex, `${r} runs after session wipe`);
            assert.ok(calls.includes(r), `${r} was invoked`);
        }
    });

    it('captures the pre-rotation key snapshot before rotation occurs', async function () {
        let rotated = false;
        let observedPreviousSecret: string | undefined;

        const models = {
            Base: {
                transaction: async (cb: TxCallback) => cb({label: 'tx'})
            },
            ApiKey: {
                refreshAllSecrets: async () => {
                    rotated = true;
                    return {count: 1};
                }
            },
            Action: {add: async () => ({})}
        };

        const internalKeys = new Map([
            ['ghost-scheduler', Promise.resolve({id: 'kid', secret: 'pre-rotation'})]
        ]) as Map<'ghost-scheduler', Promise<{id: string; secret: string}>> & {clear: () => void};

        const reset = createResetAuthentication({
            models: models as unknown as Parameters<typeof createResetAuthentication>[0]['models'],
            internalKeys,
            postScheduling: {rescheduleAll: async (opts) => {
                observedPreviousSecret = opts.previousKey?.secret;
                assert.equal(rotated, true, 'rotation runs before reschedule');
            }},
            automations: {rescheduleAll: async () => {}},
            giftService: {rescheduleAll: async () => {}},
            userService: {lockAll: async () => ({count: 0})},
            deleteAllSessions: async () => {}
        });

        await reset({options: {context: {user: 'user-1'}}});
        assert.equal(observedPreviousSecret, 'pre-rotation');
    });

    it('skips audit when no actor is in context', async function () {
        const actions: RecordedAction[] = [];
        const models = buildModels({rotated: 1, locked: 0, onAction: a => actions.push(a)});

        const internalKeys = new Map([
            ['ghost-scheduler', Promise.resolve({id: 'kid', secret: 'aaa'})]
        ]) as Map<'ghost-scheduler', Promise<{id: string; secret: string}>> & {clear: () => void};

        const reset = createResetAuthentication({
            models: models as unknown as Parameters<typeof createResetAuthentication>[0]['models'],
            internalKeys,
            postScheduling: {rescheduleAll: async () => {}},
            automations: {rescheduleAll: async () => {}},
            giftService: {rescheduleAll: async () => {}},
            userService: {lockAll: async () => ({count: 0})},
            deleteAllSessions: async () => {}
        });

        await reset({options: {}});
        assert.equal(actions.length, 0);
    });

    it('does not reschedule or destroy sessions if the transaction rolls back', async function () {
        const calls: string[] = [];
        const models = {
            Base: {
                transaction: async (cb: TxCallback) => {
                    try {
                        return await cb({label: 'tx'});
                    } catch (err) {
                        calls.push('rollback');
                        throw err;
                    }
                }
            },
            ApiKey: {
                refreshAllSecrets: async () => ({count: 2})
            },
            Action: {add: async () => ({})}
        };

        const internalKeys = new Map([
            ['ghost-scheduler', Promise.resolve({id: 'kid', secret: 'aaa'})]
        ]) as Map<'ghost-scheduler', Promise<{id: string; secret: string}>> & {clear: () => void};

        const reset = createResetAuthentication({
            models: models as unknown as Parameters<typeof createResetAuthentication>[0]['models'],
            internalKeys,
            postScheduling: {rescheduleAll: async () => {
                calls.push('postScheduling');
            }},
            automations: {rescheduleAll: async () => {
                calls.push('automations');
            }},
            giftService: {rescheduleAll: async () => {
                calls.push('giftService');
            }},
            userService: {lockAll: async () => {
                throw new Error('lock failed');
            }},
            deleteAllSessions: async () => {
                calls.push('sessions');
            }
        });

        await assert.rejects(reset({options: {context: {user: 'user-1'}}}), /lock failed/);
        assert.deepEqual(calls, ['rollback'], 'no post-commit work fires when the transaction rolls back');
    });

    it('still wipes sessions and runs other reschedules when one reschedule throws', async function () {
        const calls: string[] = [];
        const models = buildModels({rotated: 1, locked: 1, onAction: () => {}});

        const internalKeys = new Map([
            ['ghost-scheduler', Promise.resolve({id: 'kid', secret: 'aaa'})]
        ]) as Map<'ghost-scheduler', Promise<{id: string; secret: string}>> & {clear: () => void};

        const reset = createResetAuthentication({
            models: models as unknown as Parameters<typeof createResetAuthentication>[0]['models'],
            internalKeys,
            postScheduling: {rescheduleAll: async () => {
                calls.push('postScheduling');
                throw new Error('post-scheduling failed');
            }},
            automations: {rescheduleAll: async () => {
                calls.push('automations');
            }},
            giftService: {rescheduleAll: async () => {
                calls.push('giftService');
            }},
            userService: {lockAll: async () => ({count: 1})},
            deleteAllSessions: async () => {
                calls.push('sessions');
            }
        });

        const result = await reset({options: {context: {user: 'user-1'}}});

        assert.deepEqual(result, {apiKeysRotated: 1, usersLocked: 1});
        // Sessions must have been wiped before any reschedule got to throw.
        assert.equal(calls.indexOf('sessions') < calls.indexOf('postScheduling'), true);
        // The other two reschedules must have run despite the first failing.
        assert.ok(calls.includes('automations'), 'automations.rescheduleAll runs even when post-scheduling throws');
        assert.ok(calls.includes('giftService'), 'giftService.rescheduleAll runs even when post-scheduling throws');
    });
});
