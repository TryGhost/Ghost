import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

// Creates the file if missing, leaving existing contents alone
const ensureFile = (filePath: string): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, '', { flag: 'a' });
};

const adminFiles = ['built/admin/index.html', 'built/admin/assets/admin.js'];

export const stubAdminFiles = (): void => {
  adminFiles.forEach((file) => {
    const filePath = path.resolve(__dirname, '../../core/', file);
    ensureFile(filePath);
  });
};

export const stubAuthFrameFiles = (publicPath: string): void => {
  const filePath = path.resolve(publicPath, 'admin-auth/index.html');
  ensureFile(filePath);
};
