import fs from 'fs-extra';
import path from 'path';
import {format} from 'date-fns';
import * as errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

import RouteSettingsStoreBase from './RouteSettingsStoreBase';
import {parseRouteSettingsYaml, serializeRouteSettings} from '../../services/route-settings/route-settings-parser';
import type {RouteSettings} from '../../services/route-settings/route-settings-parser';
import type {RouteSettingsStore} from './RouteSettingsStoreBase';
import {errify} from '../../../shared/errify';

const SETTINGS_FILENAME = 'routes.yaml';
const DEFAULT_SETTINGS_FILENAME = 'default-routes.yaml';

const messages = {
    ensureSettings: 'Error trying to access settings files in {path}.',
    settingsLoaderError: `Error trying to load YAML setting for {setting} from '{path}'.`
};

export const getBackupRouteSettingsFilePath = (filePath: string): string => {
    const {dir, name, ext} = path.parse(filePath);
    return path.join(dir, `${name}-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}${ext}`);
};

const isEnoent = (err: Error): boolean => 'code' in err && err.code === 'ENOENT';

const fileSystemPath = (err: Error): string | undefined => ('path' in err && typeof err.path === 'string' ? err.path : undefined);

interface FileStoreOptions {
    basePath: string;
    defaultSettingsBasePath: string;
    getBackupFilePath?: (filePath: string) => string;
}

/**
 * Local-disk store for route settings. Reads and writes the canonical
 * `routes.yaml` in the content settings folder — the same file, format,
 * default-seeding and timestamped-backup behaviour the legacy
 * SettingsLoader / DefaultSettingsManager / RouteSettings trio implement,
 * consolidated behind the store contract.
 */
export default class FileStore extends RouteSettingsStoreBase implements RouteSettingsStore {
    private readonly basePath: string;
    private readonly defaultSettingsBasePath: string;
    private readonly getBackupFilePath: (filePath: string) => string;

    constructor({basePath, defaultSettingsBasePath, getBackupFilePath = getBackupRouteSettingsFilePath}: FileStoreOptions) {
        super();
        this.basePath = basePath;
        this.defaultSettingsBasePath = defaultSettingsBasePath;
        this.getBackupFilePath = getBackupFilePath;
    }

    async get(): Promise<RouteSettings> {
        const content = await this._readOrSeedDefault();

        try {
            return parseRouteSettingsYaml(content);
        } catch (err) {
            const cause = errify(err);
            if (errors.utils.isGhostError(cause)) {
                throw cause;
            }

            throw new errors.InternalServerError({
                message: tpl(messages.settingsLoaderError, {
                    setting: 'routes',
                    path: this._settingsFilePath()
                }),
                err: cause
            });
        }
    }

    async replace(settings: RouteSettings): Promise<void> {
        const filePath = this._settingsFilePath();
        const content = serializeRouteSettings(settings);

        // The previous canonical file survives as a timestamped copy —
        // same durability behaviour the legacy upload path implemented
        // with createBackupFile().
        if (await fs.pathExists(filePath)) {
            await fs.copy(filePath, this.getBackupFilePath(filePath));
        }

        await this._writeAtomic(filePath, content);
    }

    private _settingsFilePath(): string {
        return path.join(this.basePath, SETTINGS_FILENAME);
    }

    /**
     * Missing file means a first boot: seed the canonical file from the
     * bundled defaults so self-hosters keep a visible, editable
     * `routes.yaml` on disk — exactly what DefaultSettingsManager did.
     */
    private async _readOrSeedDefault(): Promise<string> {
        const filePath = this._settingsFilePath();

        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (err) {
            const cause = errify(err);
            if (!isEnoent(cause)) {
                throw new errors.InternalServerError({
                    message: tpl(messages.ensureSettings, {path: this.basePath}),
                    err: cause,
                    context: fileSystemPath(cause)
                });
            }

            const defaultFilePath = path.join(this.defaultSettingsBasePath, DEFAULT_SETTINGS_FILENAME);
            await fs.copy(defaultFilePath, filePath);

            return fs.readFile(filePath, 'utf8');
        }
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
