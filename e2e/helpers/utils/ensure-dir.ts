import * as fs from 'fs';
import logging from '@tryghost/logging';

/** Ensure the state directory exists. */
export const ensureDir = (dirPath: string) => {
    try {
        fs.mkdirSync(dirPath, {recursive: true});
    } catch (error) {
        // Log with structured context and rethrow preserving the original error as the cause
        logging.error({
            message: 'Failed to ensure directory exists',
            dirPath,
            err: error
        });
        throw new Error(`failed to ensure directory ${dirPath} exists`, {cause: error as Error});
    }
};
