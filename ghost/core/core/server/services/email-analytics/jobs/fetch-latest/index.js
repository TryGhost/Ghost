const {parentPort} = require('worker_threads');

// recurring job to fetch analytics since the most recently seen event timestamp

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Email analytics fetch-latest job cancelled before completion');
        parentPort.postMessage('cancelled');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

(async () => {
    const {run} = require('./run');
    const {eventStats, aggregateEndDate, fetchStartDate} = await run({
        domainEvents: {
            dispatch(event) {
                parentPort.postMessage({
                    event: {
                        type: event.constructor.name, 
                        data: event
                    }
                });
            }
        }
    });

    if (parentPort) {
        parentPort.postMessage(`Fetched ${eventStats.totalEvents} events and aggregated stats for ${eventStats.emailIds.length} emails in ${aggregateEndDate - fetchStartDate}ms`);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
