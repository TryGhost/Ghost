const fs = require('fs-extra');
const path = require('path');

const {parseJson, parseYaml} = require('./redirect-config-parser');
const {getBackupRedirectsFilePath} = require('./utils');

const YAML_FILENAME = 'redirects.yaml';
const JSON_FILENAME = 'redirects.json';

/**
 * Filesystem-backed redirects store. Reads existing `.yaml` and `.json`
 * configurations laid down by previous Ghost versions and writes new
 * configurations as `.json` regardless of the previous format. The
 * legacy YAML file (if any) becomes a timestamped backup on the first
 * `replaceAll`.
 *
 * @implements {import('./types').RedirectsStore}
 */
class FileStore {
    /**
     * @param {object} options
     * @param {string} options.basePath - Directory containing `redirects.json` / `redirects.yaml`
     * @param {(filePath: string) => string} [options.getBackupFilePath] - Override for the backup path strategy. Defaults to a timestamp suffix.
     */
    constructor({basePath, getBackupFilePath = getBackupRedirectsFilePath}) {
        /** @private */
        this.basePath = basePath;
        /** @private */
        this.getBackupFilePath = getBackupFilePath;
    }

    /** @returns {Promise<import('./types').RedirectConfig[]>} */
    async getAll() {
        const existingPath = await this._findExistingFile();
        if (!existingPath) {
            return [];
        }

        const content = await fs.readFile(existingPath, 'utf-8');

        return path.extname(existingPath) === '.yaml'
            ? parseYaml(content)
            : parseJson(content);
    }

    /**
     * @param {import('./types').RedirectConfig[]} redirects
     * @returns {Promise<void>}
     */
    async replaceAll(redirects) {
        const existingPath = await this._findExistingFile();
        const targetPath = path.join(this.basePath, JSON_FILENAME);

        // Order matters: never let the canonical path go empty.
        // 1. If existing file is at the SAME path we're about to write
        //    to (json → json), the upcoming atomic rename would
        //    otherwise overwrite the old content with no backup. Copy
        //    first so the prior state is preserved before the swap.
        if (existingPath && existingPath === targetPath) {
            const backupPath = this.getBackupFilePath(existingPath);
            const content = await fs.readFile(existingPath, 'utf-8');
            await this._writeAtomic(backupPath, content);
        }

        // 2. Commit the new redirects.json. On failure the old file is
        //    still at its canonical path (or in the backup we just
        //    made for the same-path case), so a failed update never
        //    wipes redirects.
        await this._writeAtomic(targetPath, JSON.stringify(redirects));

        // 3. Different-path case (yaml → json): now that the new
        //    redirects.json is in place, retire the legacy yaml to a
        //    timestamped backup. If we did this before the write,
        //    a failed write would leave nothing at any canonical path.
        //
        //    If the backup itself fails, the legacy yaml stays at its
        //    canonical path AND the new json is also there — but
        //    `getAll()` prefers yaml, so the new write would be
        //    "unreachable" and the operator would silently see stale
        //    redirects. Roll the new json back so the next read at
        //    least returns the old yaml consistently, then surface
        //    the error so the operator can retry.
        if (existingPath && existingPath !== targetPath) {
            try {
                await this._backup(existingPath);
            } catch (err) {
                await fs.remove(targetPath).catch(() => {});
                throw err;
            }
        }
    }

    /**
     * @private
     * @returns {Promise<string|null>}
     */
    async _findExistingFile() {
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

    /**
     * @private
     * @param {string} existingPath
     */
    async _backup(existingPath) {
        const backupPath = this.getBackupFilePath(existingPath);
        // The default backup path uses a per-second timestamp, so two
        // writes inside the same second collide. Match the legacy
        // behaviour of overwriting the older backup rather than failing.
        await fs.move(existingPath, backupPath, {overwrite: true});
    }

    /**
     * @private
     * @param {string} targetPath
     * @param {string} content
     */
    async _writeAtomic(targetPath, content) {
        const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
        await fs.writeFile(tmpPath, content, 'utf-8');
        try {
            await fs.rename(tmpPath, targetPath);
        } catch (err) {
            // Best-effort cleanup: leave the source filesystem in the
            // pre-write state if the rename is the part that fails.
            await fs.remove(tmpPath).catch(() => {});
            throw err;
        }
    }
}

module.exports = FileStore;
