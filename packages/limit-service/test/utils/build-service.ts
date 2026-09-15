import { LimitService, readHostSettings } from '../../src/index.ts';
import type { CurrentCountQuery, Db, ErrorsModule, LimitConfig } from '../../src/types.ts';
import type { LimitName } from '../../src/config.ts';

interface BuildOptions {
    limits?: Record<string, LimitConfig>;
    subscription?: {startDate?: string; interval?: string};
    helpLink?: string;
    db?: Db;
    errors: ErrorsModule;
}

/**
 * Build a service the way a caller does: read the host's settings, then construct from what
 * was read. Tests describe a limit and how to count it in one object, as a host's settings
 * and the product's manifest together describe it, and this takes them apart again.
 */
export function buildService({limits = {}, subscription, errors, ...rest}: BuildOptions): LimitService {
    const currentCountQueries: Partial<Record<LimitName, CurrentCountQuery>> = {};
    const hostLimits: Record<string, unknown> = {};

    for (const [name, limit] of Object.entries(limits)) {
        if (limit && typeof limit === 'object' && 'currentCountQuery' in limit) {
            const {currentCountQuery, ...configured} = limit;
            currentCountQueries[name as LimitName] = currentCountQuery;
            hostLimits[name] = configured;
        } else {
            hostLimits[name] = limit;
        }
    }

    const {settings} = readHostSettings({
        limits: hostLimits,
        subscription: subscription?.startDate ? {start: subscription.startDate} : undefined
    });

    return new LimitService({settings, currentCountQueries, errors, ...rest});
}

/** What reading a host's settings set aside, for the tests that are about that. */
export function settingsRejectedBy(raw: unknown): string[] {
    return readHostSettings(raw).rejected.map(limit => limit.name);
}
