import logging from '@tryghost/logging';
import {getInstance} from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import UpdateCheckJob from '../update-check/update-check-job';
import withDeadline, {isDeadlineExceeded} from './with-deadline';

export default function registerJobHandlers(): void {
    const jobsService = getInstance();
    const db = require('../../data/db');

    jobsService.handle(CleanTokensJob, async () => {
        const startedAt = Date.now();
        const deletedCount = await cleanTokens({db});
        logging.info({
            system: {
                event: 'clean_tokens.completed',
                deleted_count: deletedCount,
                duration_ms: Date.now() - startedAt
            }
        }, `Removed ${deletedCount} tokens older than 24 hours`);
    });

    jobsService.handle(UpdateCheckJob, async () => {
        // require() here, not at module scope: these pull in the whole API layer
        // and config, and boot must not pay for that before it registers handlers.
        const updateCheck = require('../update-check');
        const config = require('../../../shared/config');

        const startedAt = Date.now();
        const timeoutMs = config.get('updateCheck:timeout');

        let result;
        try {
            // The check no longer has a worker to cancel on shutdown, and its
            // slowest branch emails every active admin one at a time over a
            // transport with no timeout of its own, so bound the whole run. The
            // check is idempotent: an abandoned run picks up on the next one.
            // Matches what the old worker did in passing rethrowErrors - real
            // failures surface through the jobs service's Sentry capture.
            // require() hands back `any`, so name the summary shape here rather
            // than letting the generic collapse to unknown.
            result = await withDeadline<{checked: boolean; notificationsReceived?: number}>(
                updateCheck({rethrowErrors: true}),
                timeoutMs,
                UpdateCheckJob.type
            );
        } catch (err) {
            if (!isDeadlineExceeded(err)) {
                throw err;
            }
            // Slow, not broken: the work is still running and will most likely
            // finish. Reporting it as a crash would page someone over a slow
            // mail host, so say what actually happened and stop waiting.
            logging.warn({
                system: {
                    event: 'update_check.abandoned',
                    deadline_ms: timeoutMs,
                    duration_ms: Date.now() - startedAt
                }
            }, 'Update check abandoned at its deadline');
            return;
        }

        logging.info({
            system: {
                event: 'update_check.completed',
                checked: result.checked,
                notifications_received: result.notificationsReceived ?? 0,
                duration_ms: Date.now() - startedAt
            }
        }, 'Update check completed');
    });
}
