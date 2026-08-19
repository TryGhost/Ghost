import errors from '@tryghost/errors';
import {JobsService} from './jobs-service';
import type {JobsShutdownOptions} from '@tryghost/adapter-base-jobs';

let instance: JobsService | undefined;

export function init(): JobsService {
    const adapterManager = require('../adapter-manager').default;
    const logging = require('@tryghost/logging');
    const sentry = require('../../../shared/sentry');

    instance = new JobsService({
        backend: adapterManager.getAdapter('jobs'),
        logging,
        sentry
    });

    return instance;
}

export function getInstance(): JobsService {
    if (!instance) {
        throw new errors.IncorrectUsageError({
            message: 'Jobs service used before init(). Call init() from boot first.'
        });
    }
    return instance;
}

export function shutdown(options?: JobsShutdownOptions): Promise<void> {
    if (!instance) {
        return Promise.resolve();
    }
    return instance.shutdown(options);
}
