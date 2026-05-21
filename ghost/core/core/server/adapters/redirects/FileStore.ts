import fs from 'fs-extra';
import path from 'path';
import logging from '@tryghost/logging';

import RedirectsStoreBase from './RedirectsStoreBase';
import {parseJson, parseYaml} from '../../services/custom-redirects/redirect-config-parser';
import {getBackupRedirectsFilePath} from '../../services/custom-redirects/utils';
import type {RedirectConfig, RedirectsStore} from '../../services/custom-redirects/types';

const YAML_FILENAME = 'redirects.yaml';
const JSON_FILENAME = 'redirects.json';

interface FileStoreOptions {
    basePath: string;
    getBackupFilePath?: (filePath: string) => string;
}

/**
 * Reads existing `.yaml` and `.json` configs (backward-compatible with
 * pre-refactor self-hosted installs) and always writes new configs as
 * `.json`. The previous canonical file becomes a timestamped backup on
 * every successive `replaceAll`.
 */
export default class FileStore extends RedirectsStoreBase implements RedirectsStore {
    private readonly basePath: string;
    private readonly getBackupFilePath: (filePath: string) => string;

    constructor({basePath, getBackupFilePath = getBackupRedirectsFilePath}: FileStoreOptions) {
        super();
        this.basePath = basePath;
        this.getBackupFilePath = getBackupFilePath;
        logging.info(`[redirects] FileStore initialised: basePath=${this.basePath}`);
    }

    async getAll(): Promise<RedirectConfig[]> {
        const existingPath = await this._findExistingFile();
        if (!existingPath) {
            logging.info(`[redirects] FileStore.getAll: no redirects file found at basePath=${this.basePath}`);
            return [];
        }

        logging.info(`[redirects] FileStore.getAll: reading ${path.basename(existingPath)}`);
        const content = await fs.readFile(existingPath, 'utf-8');

        const parsed = path.extname(existingPath) === '.yaml'
            ? parseYaml(content)
            : parseJson(content);
        logging.info(`[redirects] FileStore.getAll: parsed ${parsed.length} redirect(s)`);
        return parsed;
    }

    async replaceAll(redirects: RedirectConfig[]): Promise<void> {
        logging.info(`[redirects] FileStore.replaceAll: writing ${redirects.length} redirect(s)`);
        const existingPath = await this._findExistingFile();
        const targetPath = path.join(this.basePath, JSON_FILENAME);

        // The ordering here keeps the canonical path readable across
        // every failure mode. See the inline notes — the obvious
        // backup-first, write-second sequence would wipe redirects on
        // a failed write.

        // Same path: backup must happen before the atomic write because
        // the rename would otherwise clobber the previous content with
        // no copy elsewhere.
        if (existingPath && existingPath === targetPath) {
            const backupPath = this.getBackupFilePath(existingPath);
            const content = await fs.readFile(existingPath, 'utf-8');
            await this._writeAtomic(backupPath, content);
            logging.info(`[redirects] FileStore.replaceAll: backed up previous file to ${path.basename(backupPath)}`);
        }

        await this._writeAtomic(targetPath, JSON.stringify(redirects));

        // Different path (yaml → json): backup must happen AFTER the
        // write so a failed write doesn't leave nothing at any canonical
        // path. If the backup itself fails, the legacy yaml takes
        // precedence over the new json on next read — roll the new json
        // back so the operator sees a consistent old state.
        if (existingPath && existingPath !== targetPath) {
            try {
                await this._backup(existingPath);
                logging.info(`[redirects] FileStore.replaceAll: migrated legacy ${path.basename(existingPath)} to ${JSON_FILENAME}`);
            } catch (err) {
                await fs.remove(targetPath).catch(() => {});
                logging.warn(`[redirects] FileStore.replaceAll: backup of legacy ${path.basename(existingPath)} failed, rolled back new ${JSON_FILENAME}`);
                throw err;
            }
        }

        logging.info(`[redirects] FileStore.replaceAll: complete`);
    }

    private async _findExistingFile(): Promise<string | null> {
        const yamlPath = path.join(this.basePath, YAML_FILENAME);
        if (await fs.pathExists(yamlPath)) {
            return yamlPath;
        }

        const jsonPath = path.join(this.basePath, JSON_FILENAME);
        if (await fs.pathExists(jsonPath)) {
            return jsonPath;
        }

        return null;
    }

    private async _backup(existingPath: string): Promise<void> {
        const backupPath = this.getBackupFilePath(existingPath);
        // Per-second timestamp granularity → same-second writes collide.
        // Overwrite rather than fail.
        await fs.move(existingPath, backupPath, {overwrite: true});
    }

    // `fs-extra.move({overwrite: true})` handles the Windows EPERM/EEXIST
    // path that bare `fs.rename` doesn't.
    private async _writeAtomic(targetPath: string, content: string): Promise<void> {
        const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        await fs.writeFile(tmpPath, content, 'utf-8');
        try {
            await fs.move(tmpPath, targetPath, {overwrite: true});
        } catch (err) {
            await fs.remove(tmpPath).catch(() => {});
            throw err;
        }
    }
}
