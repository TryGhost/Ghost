import { JobsService } from './jobs-service';
import type { GiftService } from '../gifts/gift-service';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import CleanExpiredCompedJob from '../members/jobs/clean-expired-comped-job';
import cleanExpiredComped from '../members/jobs/clean-expired-comped-task';
import CleanGiftsJob from '../gifts/jobs/clean-gifts-job';
import ExternalMediaInliner from '../media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../content-import/jobs/content-csv-import-job';
import * as contentImport from '../content-import';
import UpdateCheckJob from '../update-check/jobs/update-check-job';

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
  giftService: GiftService;
  mediaInliner: ExternalMediaInliner;
}

export default function registerJobHandlers({
  jobsService,
  db,
  logging,
  models,
  events,
  sentry,
  giftService,
  mediaInliner,
}: RegisterJobHandlersDependencies): void {
  jobsService.handle(CleanTokensJob, async () => {
    await cleanTokens({ db, logging });
  });

  jobsService.handle(CleanExpiredCompedJob, async () => {
    await cleanExpiredComped({ db, models, events, logging, sentry });
  });

  jobsService.handle(CleanGiftsJob, async () => {
    await giftService.cleanup();
  });

  jobsService.handle(ExternalMediaInlinerJob, async (job) => {
    await mediaInliner.inline(job.domains);
  });

  jobsService.handle(ContentCSVImportJob, async (job) => {
    await contentImport.handleJob(job);
  });

  jobsService.handle(UpdateCheckJob, async () => {
    await updateCheck({ rethrowErrors: true });
  });
}
