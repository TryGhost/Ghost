import fs from 'node:fs/promises';
import { existsSync, rmSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Set up the redirects file with the extension you want.
 */
export const setupFile = async (
  contentFolderForTests: string,
  ext: null | string,
): Promise<void> => {
  const yamlPath = path.join(contentFolderForTests, 'data', 'redirects.yaml');
  const jsonPath = path.join(contentFolderForTests, 'data', 'redirects.json');

  if (ext === '.json') {
    if (existsSync(yamlPath)) {
      rmSync(yamlPath, { recursive: true, force: true });
    }
    await fs.cp(path.join(__dirname, 'fixtures', 'data', 'redirects.json'), jsonPath, {
      recursive: true,
    });
  }

  if (ext === '.yaml') {
    if (existsSync(jsonPath)) {
      rmSync(jsonPath, { recursive: true, force: true });
    }
    await fs.cp(path.join(__dirname, 'fixtures', 'data', 'redirects.yaml'), yamlPath, {
      recursive: true,
    });
  }

  if (ext === null) {
    if (existsSync(yamlPath)) {
      rmSync(yamlPath, { recursive: true, force: true });
    }
    if (existsSync(jsonPath)) {
      rmSync(jsonPath, { recursive: true, force: true });
    }
  }
};
