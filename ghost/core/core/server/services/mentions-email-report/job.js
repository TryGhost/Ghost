const {parentPort} = require('worker_threads');
const StartMentionEmailReportJob = require('./StartMentionEmailReportJob');

if (parentPort) {
    parentPort.postMessage({
        event: {
            type: StartMentionEmailReportJob.name
        }
    });
    parentPort.postMessage('done');
}
