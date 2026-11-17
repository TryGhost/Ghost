// Known break of the kernel rules, kept until the clock is handed to code as a
// foundation instance: Moment is a library object with process-wide state (its
// default timezone), and getUnixTime() reads the system clock through it.
// oxlint-disable-next-line ghost/kernel-purity -- see docs/plans/domain-spike-findings.md
import momentTimezone from 'moment-timezone';

/** @deprecated Compatibility export for existing date logic. Prefer clock helpers where available. */
// oxlint-disable-next-line ghost/kernel-purity -- a library object, not a mechanism; see above
export const moment = momentTimezone;

/** Returns the current Unix time in whole seconds. */
export function getUnixTime(): number {
  return momentTimezone().unix();
}
