import {getInstance} from './index';
import CleanTokensJob from '../members/jobs/clean-tokens-job';
import cleanTokens from '../members/jobs/clean-tokens-task';
import MediaInlinerJob from '../media-inliner/media-inliner-job';

export default function registerJobHandlers(): void {
    const jobsService = getInstance();
    const db = require('../../data/db');
    const mediaInlinerService = require('../media-inliner');

    jobsService.handle(CleanTokensJob, async () => {
        await cleanTokens({db});
    });
    jobsService.handle(MediaInlinerJob, async (job: MediaInlinerJob) => {
        await mediaInlinerService.inline(job.domains);
    });
}
