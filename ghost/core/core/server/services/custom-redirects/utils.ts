import path from 'path';
import moment from 'moment-timezone';

export const getBackupRedirectsFilePath = (filePath: string): string => {
    const {dir, name, ext} = path.parse(filePath);
    return path.join(dir, `${name}-${moment().format('YYYY-MM-DD-HH-mm-ss')}${ext}`);
};
