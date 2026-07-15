import moment from 'moment-timezone';

export const COMP_EXPIRY_DURATIONS = ['forever', 'week', 'month', 'half-year', 'year', 'custom'] as const;
export type CompExpiryDuration = typeof COMP_EXPIRY_DURATIONS[number];

export function isCompExpiryDuration(value: string): value is CompExpiryDuration {
    return (COMP_EXPIRY_DURATIONS as readonly string[]).includes(value);
}

/**
 * Turn the admin's picked duration into an ISO expiry_at, matching
 * `ghost/admin/app/components/modal-member-tier.js:addTier` exactly:
 *   - forever          → null (no expiry, permanent comp)
 *   - week/month/…/year → +N from now, UTC start-of-day
 *   - custom + date    → end of the picked LOCAL day, with the timezone-offset
 *                        adjustment Ember uses to keep it on the same calendar day
 * The custom date is a `YYYY-MM-DD` string (native `<input type="date">` value)
 * parsed as LOCAL midnight — `new Date('YYYY-MM-DD')` would misparse it as UTC
 * midnight, snapping the picked day back by one for admins west of UTC.
 * When called with `custom` but no date, returns null — the UI disables the Add
 * button until a date is picked, but the helper stays safe.
 */
export function computeCompExpiryAt(duration: CompExpiryDuration, customDate?: string | null): string | null {
    switch (duration) {
    case 'forever':
        return null;
    case 'week':
        return moment.utc().add(7, 'days').startOf('day').toISOString();
    case 'month':
        return moment.utc().add(1, 'month').startOf('day').toISOString();
    case 'half-year':
        return moment.utc().add(6, 'months').startOf('day').toISOString();
    case 'year':
        return moment.utc().add(1, 'year').startOf('day').toISOString();
    case 'custom':
        if (!customDate) {
            return null;
        }
        return moment(customDate, 'YYYY-MM-DD')
            .startOf('day')
            .endOf('day')
            .set('millisecond', 0)
            .add(moment().utcOffset(), 'minutes')
            .toISOString();
    }
}
