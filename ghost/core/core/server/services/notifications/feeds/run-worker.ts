import {parentPort} from 'worker_threads';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const permissions = require('../../permissions') as {init(): Promise<void>};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const settings = require('../../settings/settings-service') as {init(): Promise<void>};

function postMessage(message: string): void {
    parentPort?.postMessage(message);
}

export function runWorker(fn: () => Promise<unknown>): void {
    if (parentPort) {
        parentPort.once('message', (message) => {
            if (message === 'cancel') {
                postMessage('cancelled');
            }
        });
    }

    (async () => {
        try {
            await permissions.init();
            await settings.init();
            await fn();
            postMessage('done');
        } finally {
            if (!parentPort) {
                setTimeout(() => process.exit(0), 1000);
            }
        }
    })();
}
