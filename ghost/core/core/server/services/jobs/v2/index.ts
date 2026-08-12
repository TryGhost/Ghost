import {JobsService} from './jobs-service';

// One jobs service per process, initialised per boot in core/boot.js with
// the adapter-selected backend and the logging/Sentry error reporter. The
// `v2` name is temporary: this directory collapses into services/jobs/ once
// the legacy @tryghost/job-manager wrapper it sits beside is removed.
const jobsService = new JobsService();

export default jobsService;
export {Job} from './job';
export {JobsService} from './jobs-service';
export type {ErrorReporter, JobClass, JobHandler} from './jobs-service';
