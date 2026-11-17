// What this application's domains share that is not foundation: a record of
// what happened, for a test to read, and a clock that stands still. A domain's
// boot.ts imports these the way one of Ghost's imports settings or mail.

/** What the fixtures did, in order, for a test to read. */
export const journal: string[] = [];

export const clock = { now: () => new Date('2026-01-01T00:00:00.000Z') };

export function reset() {
  journal.length = 0;
}
