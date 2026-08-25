import ExternalMediaInlinerJob from './jobs/external-media-inliner-job';
import type { Job } from '../jobs-service/job';

const logging = require('@tryghost/logging');
const debug = require('@tryghost/debug')('mediaInliner');

const DEFAULT_DOMAINS = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];

export interface MediaInlinerServiceDeps {
  jobsService: { dispatch(job: Job): Promise<void> };
}

export class MediaInlinerService {
  readonly #jobsService: MediaInlinerServiceDeps['jobsService'];

  constructor({ jobsService }: MediaInlinerServiceDeps) {
    this.#jobsService = jobsService;
  }

  async startMediaInliner(domains?: string[]): Promise<{ status: string }> {
    if (!domains || !domains.length) {
      domains = DEFAULT_DOMAINS;
    }

    debug('[Inliner] Starting media inlining job for domains: ', domains);

    logging.info('[Background Job] external-media-inliner queued');
    await this.#jobsService.dispatch(new ExternalMediaInlinerJob({ domains }));

    return {
      status: 'success',
    };
  }
}
