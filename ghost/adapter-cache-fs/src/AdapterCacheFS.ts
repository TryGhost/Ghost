import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import Base from '@tryghost/adapter-base-cache';

type AdapterOptions = {
    cachePath?: string;
}

/**
 * Filesystem-based cache adapter for Ghost
 *
 * To instantly invalidate the cache, we use a timestamp in the folder name. This means that
 * when we want to invalidate the cache, we can just change the timestamp and we drop all knowledge
 * of the old cache.
 *
 * To keep the overhead low, we only create the directory structure upon initialization, and then
 * during the reset() method. ie. we don't do this for ever set() call. If we want to do further directory
 * partitioning, this may need to change.
 *
 * It is up to the host system to clean up files periodically.
 */
export default class AdapterCacheFS extends Base {
    // Keep a reset count to protect against resets occuring in the same millisecond and the cache not
    // getting reset
    #resetCount: number = 0;

    // Initalize the timestamp with the current Date in ms
    #timestamp: number = Date.now();

    #cachePath: string;

    constructor(options?: AdapterOptions) {
        super();

        this.#cachePath = options?.cachePath || '/tmp';

        // Set up the initial cache folder
        fs.mkdirpSync(this._getPrefixedCacheFolder());
    }

    _generateKey(key: string): string {
        // md5 is not secure but it's fast and we're not using it for security
        // the probability of a collision is low enough that we don't care
        return crypto.createHash('md5').update(key).digest('hex');
    }

    _getPrefixedCacheFolder(timestamp: number = this.#timestamp): string {
        return path.join(this.#cachePath, `${timestamp.toString()}-${this.#resetCount.toString()}`);
    }

    async get(key: string): Promise<object | null> {
        const prefixedCacheFolder = this._getPrefixedCacheFolder();
        const keyCachePath = path.join(prefixedCacheFolder, this._generateKey(key));

        try {
            const value = await fs.readFile(keyCachePath, 'utf8');
            return JSON.parse(value);
        } catch (err) {
            return null;
        }
    }

    /**
     * Stores a value in the cache
     *
     * To do this, we generate a temporary file with a semi-random suffix, and then rename it
     * to the final one. This is to ensure that we don't end up with a half-written file, and
     * it also prevents multiple cache saves from overlapping each other.
     *
     * If it fails, do nothing except log it out.
     */
    async set(key: string, value: object): Promise<void> {
        const generatedKey = this._generateKey(key);
        const prefixedCacheFolder = this._getPrefixedCacheFolder();
        const keyCachePath = path.join(prefixedCacheFolder, generatedKey);
        const keyCachePathTemp = path.join(prefixedCacheFolder, `${generatedKey}.${Math.random().toString(36).substring(5)}}`);

        try {
            await fs.writeFile(keyCachePathTemp, JSON.stringify(value));
            await fs.rename(keyCachePathTemp, keyCachePath);
        } catch (err) {
            // TODO: log it out + add to Sentry but it's ok if we fail to store?
        }
    }

    /**
     * Resets the timestamp for this instance, which changes the cache key
     * and drops all knowledge of the existing cache.
     *
     * Also sets up the new cache folder so we don't have to set to do it in the .set() method.
     */
    async reset() {
        this.#resetCount += 1;

        const newTimestamp = Date.now();
        this.#timestamp = newTimestamp;

        await fs.mkdirp(this._getPrefixedCacheFolder(newTimestamp));
    }

    async keys(): Promise<string[]> {
        // TODO: what should we really do here? is fetching the filenames useful?
        const folderFiles = await fs.readdir(this._getPrefixedCacheFolder());
        return folderFiles;
    }
};
