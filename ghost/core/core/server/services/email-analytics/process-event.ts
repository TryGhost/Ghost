import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { EventProcessingResult } from './event-processing-result';

/** Polling retries a failed event once, then logs and counts it without blocking the page.
 * Webhooks propagate failures immediately so the provider can redeliver.
 * Batch reads and flushes remain outside this policy and still fail the fetch.
 */
export async function processEvent(
  handleEvent: () => Promise<EventProcessingResult>,
  { skipFailedEvents = false, eventId }: { skipFailedEvents?: boolean; eventId?: string },
): Promise<EventProcessingResult> {
  try {
    return await handleEvent();
  } catch (err) {
    if (!skipFailedEvents) {
      throw err;
    }
  }

  try {
    return await handleEvent();
  } catch (err) {
    logging.error(
      new errors.InternalServerError({
        message: 'Email analytics event failed after one retry; skipping event',
        context: eventId ? `Event ID: ${eventId}` : undefined,
        err: err instanceof Error ? err : String(err),
      }),
    );
    return new EventProcessingResult({ processingFailures: 1 });
  }
}
