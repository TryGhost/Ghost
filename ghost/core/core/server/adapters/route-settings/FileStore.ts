import fs from 'fs-extra';
import path from 'path';
import {format} from 'date-fns';
import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

import {RouteSettingsStoreBase, type RouteSettings} from '@tryghost/adapter-base-route-settings';

import parseYaml from '../../services/route-settings/yaml-parser';
import {parseRouteSettings} from '../../services/route-settings/route-settings-parser';

const YAML_FILENAME = 'routes.yaml';
const DEFAULT_SETTINGS_FILENAME = 'default-routes.yaml';

const messages = {
    missingPaths: 'FileStore requires basePath and defaultSettingsBasePath.',
    ensureSettings: 'Error trying to access settings files in {path}.'
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
 * Local-disk store for route settings. Reads and writes the user's
 * original `routes.yaml` verbatim — comments, ordering and formatting are
 * preserved because we persist `settings.yamlSource` (the exact bytes the
 * domain model was parsed from) rather than a re-serialised model. Every
 * `replace` turns the previous file into a timestamped backup. When no
 * `routes.yaml` exists the parsed bundled defaults are returned without
 * touching the disk; a real file only materialises on the first `replace`.
 */
export default class FileStore extends RouteSettingsStoreBase {
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
        const yamlContent = await this.readIfExists(yamlPath);
        if (yamlContent !== null) {
            return parseRouteSettings(parseYaml(yamlContent), yamlContent);
        }

        const defaultContent = await this.readDefaultSettings();
        return parseRouteSettings(parseYaml(defaultContent), defaultContent);
    }

    async replace(settings: RouteSettings): Promise<void> {
        const targetPath = path.join(this.basePath, YAML_FILENAME);

        // Back up the current file before the atomic write clobbers it. The
        // content is captured up front so the backup holds exactly what was on
        // disk; a file that isn't there just skips the backup and real read
        // failures surface as typed errors.
        const existing = await this.readIfExists(targetPath);
        if (existing !== null) {
            await this.writeAtomic(this.getBackupFilePath(targetPath), existing);
        }

        // Persist the exact YAML the operator authored — never a re-serialised
        // model — so comments, key order and formatting survive a round-trip.
        await this.writeAtomic(targetPath, settings.yamlSource);
    }

    private async readIfExists(filePath: string): Promise<string | null> {
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

    private async readDefaultSettings(): Promise<string> {
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

    private async writeAtomic(targetPath: string, content: string): Promise<void> {
        const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        try {
            await fs.ensureDir(path.dirname(targetPath));
            await fs.writeFile(tmpPath, content, 'utf-8');
            await fs.move(tmpPath, targetPath, {overwrite: true});
        } catch (err) {
            await fs.remove(tmpPath).catch(() => {});
            throw new errors.InternalServerError({
                message: tpl(messages.ensureSettings, {path: this.basePath}),
                err: err as Error,
                context: (err as NodeJS.ErrnoException).path
            });
        }
    }
}
