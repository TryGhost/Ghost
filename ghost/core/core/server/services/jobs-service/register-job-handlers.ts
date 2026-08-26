import errors from '@tryghost/errors';
import { JobsService } from './jobs-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import CleanExpiredCompedJob from '../members/jobs/clean-expired-comped-job';
import cleanExpiredComped from '../members/jobs/clean-expired-comped-task';
import * as gifts from '../gifts';
import CleanGiftsJob from '../gifts/jobs/clean-gifts-job';
import ExternalMediaInliner from '../media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../content-import/jobs/content-csv-import-job';
import * as contentImport from '../content-import';
import UpdateCheckJob from '../update-check/jobs/update-check-job';
import UpdateCheckBootJob from '../update-check/jobs/update-check-boot-job';

const updateCheck = require('../update-check');

interface RegisterJobHandlersDependencies {
  jobsService: JobsService;
  db: typeof import('../../data/db');
  logging: typeof import('@tryghost/logging');
  // Structural types: models, lib/common/events and shared/sentry are
  // untyped CommonJS modules, so name just the surface the handlers consume.
  models: {
    Member: {
      findOne(
        data: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<{ attributes: Record<string, unknown> }>;
    };
  };
  events: { emit(name: string, model: unknown, options: Record<string, unknown>): void };
  sentry: { captureException(err: unknown): void };
  mediaInliner: ExternalMediaInliner;
}

export default function registerJobHandlers({
  jobsService,
  db,
  logging,
  models,
  events,
  sentry,
  mediaInliner,
}: RegisterJobHandlersDependencies): void {
  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });

  jobsService.handle(CleanExpiredCompedJob, async () => {
    await cleanExpiredComped({ db, models, events, logging, sentry });
  });

  jobsService.handle(CleanGiftsJob, async () => {
    if (!gifts.service) {
      throw new errors.IncorrectUsageError({
        message: 'clean-gifts ran before the gifts service was initialised',
      });
    }
    await gifts.service.cleanup();
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    await mediaInliner.inline(job.domains);
  });

  jobsService.handle(ContentCSVImportJob, async (job) => {
    await contentImport.handleJob(job);
  });

  // Both types run the same check. Delivery is keyed per type, so each class
  // needs its own registration; the boot and recurring runs keep distinct
  // log/Sentry identities via the envelope type, not the handler.
  const runUpdateCheck = async () => {
    await updateCheck({ rethrowErrors: true });
  };
  jobsService.handle(UpdateCheckJob, runUpdateCheck);
  jobsService.handle(UpdateCheckBootJob, runUpdateCheck);
}
