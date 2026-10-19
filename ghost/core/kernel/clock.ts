import momentTimezone from 'moment-timezone';

/** @deprecated Compatibility export for existing date logic. Prefer clock helpers where available. */
export const moment = momentTimezone;

/** Returns the current Unix time in whole seconds. */
export function getUnixTime(): number {
  return momentTimezone().unix();
}
