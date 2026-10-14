import * as fs from 'fs-extra';
import * as path from 'node:path';

const adminFiles = ['built/admin/index.html', 'built/admin/assets/admin.js'];

export const stubAdminFiles = (): void => {
  adminFiles.forEach((file) => {
    const filePath = path.resolve(__dirname, '../../core/', file);
    fs.ensureFileSync(filePath);
  });
};

export const stubAuthFrameFiles = (publicPath: string): void => {
  const filePath = path.resolve(publicPath, 'admin-auth/index.html');
  fs.ensureFileSync(filePath);
};
