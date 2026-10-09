import path from 'path';

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

const timestamp = (date: Date): string =>
  [
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('-');

export const getBackupRouteSettingsFilePath = (filePath: string): string => {
  const { dir, name, ext } = path.parse(filePath);
  return path.join(dir, `${name}-${timestamp(new Date())}${ext}`);
};
