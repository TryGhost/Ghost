export const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_ATTEMPTS = 10;
export const MAX_STEPS_PER_BATCH = 500;
export const RETRY_DELAY_MS = 10 * 60 * 1000;

/** How many members to enter into a "label added" automation per transaction. */
export const LABEL_ADDED_BATCH_SIZE = 5000;
/**
 * How far back to re-check for label additions. Label rows can be committed a
 * little after their `created_at`, so we re-check a window we've already seen.
 * Members never enter the same automation twice, so re-checking is harmless.
 */
export const LABEL_ADDED_OVERLAP_MS = 60 * 60 * 1000;
/** How often to look for members who've had a trigger label added. */
export const LABEL_ADDED_POLL_INTERVAL_MS = 15 * 60 * 1000;
