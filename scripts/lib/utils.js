import {readFileSync, writeFileSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {exec as execCallback} from 'node:child_process';
import {promisify} from 'node:util';

export const execAsync = promisify(execCallback);

/** @param {string} filePath */
export const readJson = async filePath => JSON.parse(await readFile(filePath, 'utf8'));
/** @param {string} filePath */
export const readJsonSync = filePath => JSON.parse(readFileSync(filePath, 'utf8'));

/**
 * @param {string} filePath
 * @param {object} json
 */
export const writeJson = async (filePath, json) => await writeFile(filePath, JSON.stringify(json, null, 4) + '\n', 'utf8');
/**
 * @param {string} filePath
 * @param {object} json
 */
export const writeJsonSync = (filePath, json) => writeFileSync(filePath, JSON.stringify(json, null, 4) + '\n', 'utf8');
