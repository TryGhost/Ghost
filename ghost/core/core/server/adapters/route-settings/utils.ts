import path from 'path';
import {format} from 'date-fns';

export const getBackupRouteSettingsFilePath = (filePath: string): string => {
    const {dir, name, ext} = path.parse(filePath);
    return path.join(dir, `${name}-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}${ext}`);
};
