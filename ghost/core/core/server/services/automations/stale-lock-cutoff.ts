import {LOCK_TIMEOUT_MS} from './constants';

export function getStaleLockCutoff(now: Readonly<Date>): Date {
    return new Date(now.getTime() - LOCK_TIMEOUT_MS);
}
