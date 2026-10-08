import { setTimeout as delay } from 'node:timers/promises';
import logging from '@tryghost/logging';
import metrics from '@tryghost/metrics';

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Drain buffered log transports before the process exits, bounded so a stuck
 * transport can never block shutdown.
 */
export async function flushLogsAndMetrics(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> {
  // Unreffed so the loser of the race can't hold the event loop open
  await Promise.race([
    Promise.all([logging.flush(), metrics.flush()]),
    delay(timeoutMs, undefined, { ref: false }),
  ]);
}
