/** Members need this many tracked emails before an open rate is meaningful. */
export const MIN_EMAIL_COUNT_FOR_OPEN_RATE = 5;

/**
 * Percentage open rate rounded to a whole number, or null below the tracked
 * email threshold. Shared by the batched recount and the counter writers so
 * the rounding and threshold cannot drift between them. The sequential
 * recount keeps its own form because it leaves the column untouched below
 * the threshold instead of writing null.
 */
export function deriveOpenRate(openedCount: number, trackedCount: number): number | null {
  if (trackedCount < MIN_EMAIL_COUNT_FOR_OPEN_RATE) {
    return null;
  }
  return Math.round((openedCount / trackedCount) * 100);
}
