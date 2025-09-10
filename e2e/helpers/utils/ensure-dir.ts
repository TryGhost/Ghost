import fs from 'fs';
import logging from '@tryghost/logging';

/** Ensure the state directory exists. */
export const ensureDir = (dirPath: string) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, {recursive: true});
        }
    } catch (error) {
        if (!fs.existsSync(dirPath)) {
            logging.error(`failed to ensure directory ${dirPath} exists:`, error);
            throw new Error(`failed to ensure directory ${dirPath} exists: ${error}`);
        }
    }
};
