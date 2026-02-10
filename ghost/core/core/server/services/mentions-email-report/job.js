const {parentPort} = require('worker_threads');
const StartMentionEmailReportJob = require('./start-mention-email-report-job');

if (parentPort) {
    parentPort.postMessage({
        event: {
            type: StartMentionEmailReportJob.name
        }
    });
    parentPort.postMessage('done');
}
