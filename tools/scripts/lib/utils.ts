import { readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

export const execAsync = promisify(execCallback);

// The type parameter is an unchecked assertion about the file's shape.
export const readJson = async <T = unknown>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8'));
export const readJsonSync = <T = unknown>(filePath: string): T =>
  JSON.parse(readFileSync(filePath, 'utf8'));

export const writeJson = async (filePath: string, json: object) =>
  await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
export const writeJsonSync = (filePath: string, json: object) =>
  writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
