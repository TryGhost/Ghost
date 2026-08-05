import path from 'path';

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/**
 * Local-time `yyyy-MM-dd-HH-mm-ss`, matching what `date-fns` produced here
 * before it was removed.
 *
 * Deliberately hand-rolled: this module is imported by the route-settings
 * stores, which are constructed during boot, so importing the library here
 * pulled 313 extra modules onto the boot path for a helper that only ever
 * runs on upload.
 *
 * Only safe for a valid `Date`. Unlike `date-fns` it does not throw on an
 * invalid one, and it has no era handling for years before 1 AD — the sole
 * caller passes `new Date()`, so neither is reachable. If you need either,
 * or any locale- or timezone-dependent token, reach for a library rather
 * than extending this.
 */
const timestamp = (date: Date): string => [
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
].join('-');

export const getBackupRouteSettingsFilePath = (filePath: string): string => {
    const {dir, name, ext} = path.parse(filePath);
    return path.join(dir, `${name}-${timestamp(new Date())}${ext}`);
};
