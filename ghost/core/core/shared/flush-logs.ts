import { setTimeout as delay } from 'node:timers/promises';
import logging from '@tryghost/logging';

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Drain buffered log transports before the process exits, bounded so a stuck
 * transport can never block shutdown.
 */
export async function flushLogs(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> {
  // Unreffed so the loser of the race can't hold the event loop open
  await Promise.race([logging.flush(), delay(timeoutMs, undefined, { ref: false })]);
}
