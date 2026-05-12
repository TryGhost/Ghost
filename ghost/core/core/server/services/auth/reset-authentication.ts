/* eslint-disable @typescript-eslint/no-explicit-any */
// models/index.js is the Bookshelf model registry — a JS module without
// TypeScript declarations. The contracts we need from it are narrow, so
// we accept `any` rather than introduce a sweeping shim here.
import type {InternalApiKey, InternalIntegrationSlug} from '../internal-keys';

interface ResetAuthenticationDeps {
    models: any;
    internalKeys: Map<InternalIntegrationSlug, Promise<InternalApiKey>>;
    // eslint-disable-next-line no-unused-vars
    postScheduling: {rescheduleAll(opts: {previousKey?: InternalApiKey}): Promise<void>};
    // eslint-disable-next-line no-unused-vars
    automations: {rescheduleAll(opts: {previousKey?: InternalApiKey}): Promise<void> | void};
    // eslint-disable-next-line no-unused-vars
    giftService: {rescheduleAll(opts: {previousKey?: InternalApiKey}): Promise<void>};
    // eslint-disable-next-line no-unused-vars
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
 * the in-process key cache, re-issue every queued scheduler callback under
 * the new key, lock every user, and destroy every session.
 *
 * Rotation, user lock, and the audit row are written in a single transaction
 * so app crashes mid-flight can't leave the system in a half-rotated state or
 * lose the audit trail. Rescheduling and session-wipe sit outside the
 * transaction — they're in-memory and out-of-band respectively.
 */
export default function createResetAuthentication({
    models,
    internalKeys,
    postScheduling,
    automations,
    giftService,
    userService,
    deleteAllSessions
}: ResetAuthenticationDeps) {
    return async function resetAuthentication({options}: {options: ResetAuthenticationOptions}): Promise<ResetAuthenticationResult> {
        // Snapshot the current scheduler key BEFORE rotation so adapter-queued
        // URLs can be reconstructed for unschedule.
        const previousSchedulerKey = await internalKeys.get('ghost-scheduler');
        const actorId = options?.context?.user ?? null;

        const {apiKeysRotated, usersLocked} = await models.Base.transaction(async (tx: any) => {
            const txOptions = Object.assign({}, options, {transacting: tx});

            const {count: rotated} = await models.ApiKey.refreshAllSecrets(txOptions);
            const {count: locked} = await userService.lockAll(txOptions);

            if (actorId) {
                await models.Action.add({
                    event: 'reset_authentication',
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

        // Cache clear + reschedule happen AFTER commit so the in-process cache
        // refills from the newly-committed rows, not from rows that might still
        // roll back. Session wipe also goes here — express-session isn't part
        // of this transaction.
        internalKeys.clear();

        const rescheduleOptions = {previousKey: previousSchedulerKey};
        await postScheduling.rescheduleAll(rescheduleOptions);
        await automations.rescheduleAll(rescheduleOptions);
        await giftService.rescheduleAll(rescheduleOptions);

        await deleteAllSessions();

        return {apiKeysRotated, usersLocked};
    };
}
