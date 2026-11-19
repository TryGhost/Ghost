import { toUnixTime } from '@tryghost/kernel/clock';
import momentTimezone from 'moment-timezone';
import application from '../../bootstrap/app';

// Ghost's clock is built once, by the application, and held there. This path
// is kept for the code that imports the time instead of being handed it.

/** Returns the current Unix time in whole seconds, read from the foundation's clock. */
export function getUnixTime(): number {
  return toUnixTime(application.foundation.clock.now());
}

/**
 * @deprecated Compatibility export for existing date logic. It is the Moment
 * Timezone library itself, which reads the system time on its own and not the
 * foundation's clock. Prefer `getUnixTime()` and the kernel's date helpers.
 */
export const moment = momentTimezone;
