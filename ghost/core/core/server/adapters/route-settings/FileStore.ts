import fs from 'fs-extra';
import path from 'path';
import {format} from 'date-fns';
import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

import RouteSettingsStoreBase from './RouteSettingsStoreBase';
import parseYaml from '../../services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../services/route-settings/route-settings-parser';
import type {RouteSettings} from '../../services/route-settings/route-settings-parser';
import type {RouteSettingsStore} from './RouteSettingsStoreBase';

const YAML_FILENAME = 'routes.yaml';
const JSON_FILENAME = 'routes.json';
const DEFAULT_SETTINGS_FILENAME = 'default-routes.yaml';

const messages = {
    missingPaths: 'FileStore requires basePath and defaultSettingsBasePath.',
    ensureSettings: 'Error trying to access settings files in {path}.',
    corruptJson: `Could not parse route settings JSON from '{path}': {context}.`,
    invalidJson: `Route settings JSON at '{path}' does not contain valid route settings.`
};

export const getBackupRouteSettingsFilePath = (filePath: string): string => {
    const {dir, name, ext} = path.parse(filePath);
    return path.join(dir, `${name}-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}${ext}`);
};

interface FileStoreOptions {
    basePath: string;
    defaultSettingsBasePath: string;
    getBackupFilePath?: (filePath: string) => string;
}

/**
 * Local-disk store for route settings. Reads existing `routes.yaml`
 * (backward compatible with pre-refactor installs) and `routes.json`,
 * always writes the domain object as `routes.json` — the previous
 * canonical file becomes a timestamped backup on every `replace`.
 * When no canonical file exists the parsed bundled defaults are
 * returned without touching the disk; a real file only materialises
 * on the first `replace`.
 */
export default class FileStore extends RouteSettingsStoreBase implements RouteSettingsStore {
    private readonly basePath: string;
    private readonly defaultSettingsBasePath: string;
    private readonly getBackupFilePath: (filePath: string) => string;

    constructor({basePath, defaultSettingsBasePath, getBackupFilePath = getBackupRouteSettingsFilePath}: FileStoreOptions) {
        super();

        if (!basePath || !defaultSettingsBasePath) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingPaths)
            });
        }

        this.basePath = basePath;
        this.defaultSettingsBasePath = defaultSettingsBasePath;
        this.getBackupFilePath = getBackupFilePath;
    }

    async get(): Promise<RouteSettings> {
        const yamlPath = path.join(this.basePath, YAML_FILENAME);
        const yamlContent = await this._readIfExists(yamlPath);
        if (yamlContent !== null) {
            return parseRouteSettings(parseYaml(yamlContent));
        }

        const jsonPath = path.join(this.basePath, JSON_FILENAME);
        const jsonContent = await this._readIfExists(jsonPath);
        if (jsonContent !== null) {
            return this._parseStoredJson(jsonContent, jsonPath);
        }

        const defaultContent = await this._readDefaultSettings();
        return parseRouteSettings(parseYaml(defaultContent));
    }

    async replace(settings: RouteSettings): Promise<void> {
        const existingPath = await this._findExistingFile();
        const targetPath = path.join(this.basePath, JSON_FILENAME);

        // Same path: backup must happen before the atomic write because
        // the rename would otherwise clobber the previous content with
        // no copy elsewhere. Read via _readIfExists so a file that vanished
        // since _findExistingFile just skips the backup, and real read
        // failures surface as typed errors.
        if (existingPath && existingPath === targetPath) {
            const backupPath = this.getBackupFilePath(existingPath);
            const content = await this._readIfExists(existingPath);
            if (content !== null) {
                await this._writeAtomic(backupPath, content);
            }
        }

        await this._writeAtomic(targetPath, JSON.stringify(settings, null, 4));

        // Different path (yaml → json): backup must happen AFTER the
        // write so a failed write doesn't leave nothing at any canonical
        // path. If the backup itself fails, the legacy yaml takes
        // precedence over the new json on next read — roll the new json
        // back so the operator sees a consistent old state.
        if (existingPath && existingPath !== targetPath) {
            try {
                await this._backup(existingPath);
            } catch (err) {
                await fs.remove(targetPath).catch(() => {});
                throw err;
            }
        }
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

    private async _readIfExists(filePath: string): Promise<string | null> {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }

            throw new errors.InternalServerError({
                message: tpl(messages.ensureSettings, {path: this.basePath}),
                err: err as Error,
                context: (err as NodeJS.ErrnoException).path
            });
        }
    }

    private async _readDefaultSettings(): Promise<string> {
        const defaultFilePath = path.join(this.defaultSettingsBasePath, DEFAULT_SETTINGS_FILENAME);
        try {
            return await fs.readFile(defaultFilePath, 'utf8');
        } catch (err) {
            throw new errors.InternalServerError({
                message: tpl(messages.ensureSettings, {path: this.defaultSettingsBasePath}),
                err: err as Error,
                context: (err as NodeJS.ErrnoException).path
            });
        }
    }

    private _parseStoredJson(content: string, filePath: string): RouteSettings {
        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch (err) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.corruptJson, {path: filePath, context: (err as Error).message}),
                err: err as Error
            });
        }

        const candidate = parsed as Partial<RouteSettings> | null;
        const isPlainObject = (value: unknown): boolean => typeof value === 'object' && value !== null && !Array.isArray(value);
        if (!isPlainObject(candidate) || !Array.isArray(candidate?.routes) || !Array.isArray(candidate?.collections) || !isPlainObject(candidate?.taxonomies)) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.invalidJson, {path: filePath})
            });
        }

        return parsed as RouteSettings;
    }

    private async _backup(existingPath: string): Promise<void> {
        const backupPath = this.getBackupFilePath(existingPath);
        await fs.move(existingPath, backupPath, {overwrite: true});
    }

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
