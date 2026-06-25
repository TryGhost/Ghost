import type {Knex} from 'knex';
import {actionLogger, type LogAction, type RequestContext} from '../actions';
import type {InternalApiKey, InternalKeys} from '../internal-keys';
import internalKeysDefault from '../internal-keys';
const modelsDefault = require('../../models');
const {deleteAllSessions: deleteAllSessionsDefault} = require('./session');

interface ResetAuthenticationArgs {
    schedulerAdapter: {rescheduleAll(opts: {previousKey?: InternalApiKey}): Promise<unknown>};
    userService: {lockAll(options: any): Promise<{count: number}>};
    options: {context?: {user?: string}; [key: string]: unknown};
    models?: any;
    internalKeys?: InternalKeys;
    deleteAllSessions?: () => Promise<void>;
    logAction?: LogAction;
}

interface ResetAuthenticationResult {
    apiKeysRotated: number;
    usersLocked: number;
}

/**
 * Rotation and user lock commit in a single transaction so a crash mid-flight can't half-rotate the
 * system. Session deletion runs after the commit but before rescheduleAll, so an adapter failure
 * can't leave stale sessions live for an attacker.
 */
export default async function resetAuthentication(context: RequestContext, {
    schedulerAdapter,
    userService,
    options,
    models = modelsDefault,
    internalKeys = internalKeysDefault,
    deleteAllSessions = deleteAllSessionsDefault,
    logAction = actionLogger(modelsDefault.Action)
}: ResetAuthenticationArgs): Promise<ResetAuthenticationResult> {
    const previousSchedulerKey = await internalKeys.get('ghost-scheduler');

    const {apiKeysRotated, usersLocked} = await models.Base.transaction(async (tx: Knex.Transaction) => {
        const txOptions = Object.assign({}, options, {transacting: tx});

        const {count: rotated} = await models.ApiKey.refreshAllSecrets(txOptions);
        const {count: locked} = await userService.lockAll(txOptions);

        return {apiKeysRotated: rotated, usersLocked: locked};
    });

    if (context.actor) {
        await logAction({
            event: 'edited',
            resourceType: 'security_action',
            resourceId: null,
            actionName: 'reset_authentication',
            actor: context.actor
        });
    }

    internalKeys.clear();
    await deleteAllSessions();
    await schedulerAdapter.rescheduleAll({previousKey: previousSchedulerKey});

    return {apiKeysRotated, usersLocked};
}
