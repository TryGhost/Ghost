const { parentPort } = require('worker_threads');

// recurring job to fetch analytics since the most recently seen event timestamp

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
/**
 * @returns {void}
 */
function cancel() {
  if (parentPort) {
    parentPort.postMessage('cancelled before completion');
    parentPort.postMessage('cancelled');
  } else {
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

/**
 * @param {object} options
 * @param {{name: string}} options.event
 * @returns {void}
 */
exports.run = ({ event }) => {
  if (parentPort) {
    parentPort.postMessage('execution started');
    parentPort.once('message', (message) => {
      if (message === 'cancel') {
        cancel();
        return;
      }
    });

    // We send an event message, so that it is emitted on the main thread by the job manager
    // This will start the email analytics job on the main thread (the wrapper service is listening for this event)
    parentPort.postMessage({
      event: {
        type: event.name,
      },
    });

    parentPort.postMessage('done');
  } else {
    // give the logging pipes time finish writing before exit
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
