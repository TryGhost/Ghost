/**
 * The single boot step that registers every v2 job handler — this file is
 * the place to read "what jobs exist". One registration per job type: the
 * job class is pure data, and the handler closes over the services it needs.
 *
 * Runs at the end of initServices, once per boot (a re-boot re-registers
 * everything on a clean slate — see JobsService.init), so every service a
 * handler closes over has been initialised.
 */
function registerJobHandlers() {
    // Handlers are registered here as their call sites migrate from the
    // legacy @tryghost/job-manager to the v2 jobs service.
    const jobsService = require('./index').default;

    // Media inlining: fetch external media from the given domains and store
    // it locally. Dispatched by the media-inliner service on demand (admin
    // API `db/media/inline`). The handler reads the api off the module on
    // every run so it always uses the current boot's service instance.
    const MediaInlinerJob = require('../../media-inliner/media-inliner-job');
    const mediaInlinerService = require('../../media-inliner');
    jobsService.handle(MediaInlinerJob, async (job) => {
        await mediaInlinerService.api.inline(job.domains);
    });

    // Expired token cleanup: delete single-use (magic link) tokens older
    // than 24 hours. Scheduled with a randomised daily cron by
    // initBackgroundServices once handlers are registered. Idempotent, so
    // redelivery on a future durable backend is safe. Mirrors the legacy
    // worker in services/members/jobs/clean-tokens.js, which keeps serving
    // the jobsV2-flag-off path until the flag graduates.
    const CleanTokensJob = require('../../members/jobs/clean-tokens-job');
    jobsService.handle(CleanTokensJob, async () => {
        const debug = require('@tryghost/debug')('jobs:clean-tokens');
        const moment = require('moment');
        const db = require('../../../data/db');

        const d = moment.utc().subtract(24, 'hours');
        const deletedTokens = await db.knex('tokens')
            .where('created_at', '<', d.format('YYYY-MM-DD HH:mm:ss')) // we need to be careful about the type here. .format() is the only thing that works across SQLite and MySQL
            .delete();

        debug(`Removed ${deletedTokens} tokens created before ${d.toISOString()}`);
    });
}

module.exports = {registerJobHandlers};
