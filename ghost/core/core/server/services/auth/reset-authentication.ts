/* eslint-disable @typescript-eslint/no-explicit-any */
// models/index.js is the Bookshelf model registry — a JS module without
// TypeScript declarations. The contracts we need from it are narrow, so
// we accept `any` rather than introduce a sweeping shim here.
import type {Knex} from 'knex';
import type {InternalApiKey, InternalIntegrationSlug} from '../internal-keys';

interface ResetAuthenticationDeps {
    models: any;
    internalKeys: Map<InternalIntegrationSlug, Promise<InternalApiKey>>;
    schedulerAdapter: {rescheduleAll(opts: {previousKey?: InternalApiKey}): Promise<unknown>};
    userService: {lockAll(options: any): Promise<{count: number}>};
    deleteAllSessions: () => Promise<void>;
}

interface ResetAuthenticationOptions {
    context?: {user?: string};
    [key: string]: unknown;
}

interface ResetAuthenticationResult {
    apiKeysRotated: number;
    usersLocked: number;
}

/**
 * Build the "reset all authentication" action: rotate every API key, refresh
 * the in-process key cache, lock every staff user, destroy every session, and
 * re-issue every queued scheduler callback under the new key.
 *
 * Rotation, user lock, and the audit row are written in a single transaction
 * so app crashes mid-flight can't leave the system in a half-rotated state or
 * lose the audit trail. After the commit, session deletion runs as a critical
 * step (errors propagate) so a partial response can't leave stale sessions
 * for an attacker. The scheduler-adapter's `rescheduleAll` runs last; each
 * registered scheduler-user is invoked under Promise.allSettled by the
 * adapter, so a failure in one doesn't block the others or roll back the
 * rotation. Daily cron and event paths re-issue on the next trigger.
 */
export default function createResetAuthentication({
    models,
    internalKeys,
    schedulerAdapter,
    userService,
    deleteAllSessions
}: ResetAuthenticationDeps) {
    return async function resetAuthentication({options}: {options: ResetAuthenticationOptions}): Promise<ResetAuthenticationResult> {
        // Snapshot the current scheduler key BEFORE rotation so adapter-queued
        // URLs can be reconstructed for unschedule.
        const previousSchedulerKey = await internalKeys.get('ghost-scheduler');
        const actorId = options?.context?.user ?? null;

        const {apiKeysRotated, usersLocked} = await models.Base.transaction(async (tx: Knex.Transaction) => {
            const txOptions = Object.assign({}, options, {transacting: tx});

            const {count: rotated} = await models.ApiKey.refreshAllSecrets(txOptions);
            const {count: locked} = await userService.lockAll(txOptions);

            if (actorId) {
                await models.Action.add({
                    event: 'edited',
                    resource_type: 'security_action',
                    resource_id: null,
                    actor_type: 'user',
                    actor_id: actorId,
                    context: {
                        action_name: 'reset_authentication',
                        api_keys_rotated: rotated,
                        users_locked: locked
                    }
                }, {transacting: tx, autoRefresh: false});
            }

            return {apiKeysRotated: rotated, usersLocked: locked};
        });

        // After the commit, the in-process key cache is invalidated so the
        // next reader pulls the newly-committed rows.
        internalKeys.clear();

        // Session deletion is part of the security guarantee — it must run
        // before anything that could throw, so a failed reschedule can't
        // leave stale sessions live for an attacker.
        await deleteAllSessions();

        // The adapter delegates to every registered scheduler-user under
        // Promise.allSettled; a single failure doesn't unwind the others
        // or the rotation. The chain catches up via cron/events afterward.
        await schedulerAdapter.rescheduleAll({previousKey: previousSchedulerKey});

        return {apiKeysRotated, usersLocked};
    };
}
