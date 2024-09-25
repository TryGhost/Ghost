import * as Sentry from '@sentry/ember';
import Service, {inject as service} from '@ember/service';
import config from 'ghost-admin/config/environment';
import {task, timeout} from 'ember-concurrency';

/**
 * Service to manage local post revisions in localStorage
 */
export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
        this.MIN_REVISION_TIME = this.isTesting ? 50 : 60000; // 1 minute in ms
        this.performSave = this.performSave.bind(this);
        this.storage = window.localStorage;
    }

    @service store;

    // base key prefix to avoid collisions in localStorage
    _prefix = 'post-revision';
    latestRevisionTime = null;

    // key to store a simple index of all revisions
    _indexKey = 'ghost-revisions';

    /**
     * 
     * @param {object} data - serialized post data, must include id and revisionTimestamp
     * @returns {string} - key to store the revision in localStorage
     */
    generateKey(data) {
        return `${this._prefix}-${data.id}-${data.revisionTimestamp}`;
    }

    /**
     * Performs the save operations, either immediately or after a delay
     * 
     * leepLatest ensures the latest changes will be saved
     * @param {string} type - post or page
     * @param {object} data - serialized post data
     */
    @task({keepLatest: true})
    *saveTask(type, data) {
        try {
            const currentTime = Date.now();
            if (!this.lastRevisionTime || currentTime - this.lastRevisionTime > this.MIN_REVISION_TIME) {
                yield this.performSave(type, data);
                this.lastRevisionTime = currentTime;
            } else {
                const waitTime = this.MIN_REVISION_TIME - (currentTime - this.lastRevisionTime);
                yield timeout(waitTime);
                yield this.performSave(type, data);
                this.lastRevisionTime = Date.now();
            }
        } catch (err) {
            Sentry.captureException(err, {tags: {localRevisions: 'saveTaskError'}});
        }
    }

    /**
     * Saves the revision to localStorage
     * 
     * If localStorage is full, the oldest revision will be removed
     * @param {string} type - post or page
     * @param {object} data - serialized post data
     * @returns {string | undefined} - key of the saved revision or undefined if it couldn't be saved
     */
    performSave(type, data) {
        data.id = data.id || 'draft';
        data.type = type;
        data.revisionTimestamp = Date.now();
        const key = this.generateKey(data);
        try {
            const allKeys = this.keys();
            allKeys.push(key);
            this.storage.setItem(this._indexKey, JSON.stringify(allKeys));
            this.storage.setItem(key, JSON.stringify(data));
            
            // Apply the filter after saving
            this.filterRevisions(data.id);
            
            return key;
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                // Remove the current key in case it's already in the index
                this.remove(key);
                
                // If there are any revisions, remove the oldest one and try to save again
                if (this.keys().length) {
                    Sentry.captureMessage('LocalStorage quota exceeded. Removing old revisions.', {tags: {localRevisions: 'quotaExceeded'}});
                    this.removeOldest();
                    return this.performSave(type, data);
                }
                // LocalStorage is full and there are no revisions to remove
                // We can't save the revision
                Sentry.captureMessage('LocalStorage quota exceeded. Unable to save revision.', {tags: {localRevisions: 'quotaExceededNoSpace'}});
                return;
            } else {
                Sentry.captureException(err, {tags: {localRevisions: 'saveError'}});
                return;
            }
        }
    }

    /**
     * Method to trigger the save task
     * @param {string} type - post or page
     * @param {object} data - serialized post data
     */
    scheduleSave(type, data) {
        if (data && data.status && data.status === 'draft') {
            this.saveTask.perform(type, data);
        }
    }

    /**
     * Returns the specified revision from localStorage, or null if it doesn't exist
     * @param {string} key - key of the revision to find
     * @returns {string | null}
     */
    find(key) {
        return JSON.parse(this.storage.getItem(key));
    }

    /**
     * Returns all revisions from localStorage as an array, optionally filtered by key prefix and ordered by timestamp
     * @param {string | undefined} prefix - optional prefix to filter revision keys
     * @returns {Array} - all revisions matching the prefix, ordered by timestamp (newest first)
     */
    findAll(prefix = this._prefix) {
        const keys = this.keys(prefix);
        const revisions = keys.map((key) => {
            const revision = JSON.parse(this.storage.getItem(key));
            return {
                key,
                ...revision
            };
        });
        
        // Sort revisions by timestamp, newest first
        revisions.sort((a, b) => b.revisionTimestamp - a.revisionTimestamp);
        
        return revisions;
    }

    /**
     * Removes the specified key from localStorage
     * @param {string} key 
     */
    remove(key) {
        this.storage.removeItem(key);
        const keys = this.keys();
        let index = keys.indexOf(key);
        if (index !== -1) {
            keys.splice(index, 1);
        }
        this.storage.setItem(this._indexKey, JSON.stringify(keys));
    }

    /**
     * Finds the oldest revision and removes it from localStorage to clear up space
     */
    removeOldest() {
        const keys = this.keys();
        const keysByTimestamp = keys.map(key => ({key, timestamp: this.find(key).revisionTimestamp}));
        keysByTimestamp.sort((a, b) => a.timestamp - b.timestamp);
        this.remove(keysByTimestamp[0].key);
    }

    /**
     * Removes all revisions from localStorage
     */
    clear() {
        const keys = this.keys();
        for (const key of keys) {
            this.remove(key);
        }
    }

    /**
     * Returns all revision keys from localStorage, optionally filtered by key prefix
     * @param {string | undefined} prefix 
     * @returns {string[]}
     */
    keys(prefix = undefined) {
        let keys = JSON.parse(this.storage.getItem(this._indexKey) || '[]');
        if (prefix) {
            keys = keys.filter(key => key.startsWith(prefix));
        }
        return keys;
    }

    /**
     * Logs all revisions to the console
     * 
     * Currently this is the only UI for local revisions
     */
    list() {
        const revisions = this.findAll();
        const data = {};
        for (const [key, revision] of Object.entries(revisions)) {
            if (!data[revision.title]) {
                data[revision.title] = [];
            }
            data[revision.title].push({
                key,
                timestamp: revision.revisionTimestamp,
                time: new Date(revision.revisionTimestamp).toLocaleString(),
                title: revision.title,
                type: revision.type,
                id: revision.id
            });
        }
        /* eslint-disable no-console */
        console.groupCollapsed('Local revisions');
        for (const [title, row] of Object.entries(data)) {
            // eslint-disable-next-line no-console
            console.groupCollapsed(`${title}`);
            for (const item of row.sort((a, b) => b.timestamp - a.timestamp)) {
                // eslint-disable-next-line no-console
                console.groupCollapsed(`${item.time}`);
                console.log('Revision ID: ', item.key);
                console.groupEnd();
            }
            console.groupEnd();
        }
        console.groupEnd();
        /* eslint-enable no-console */
    }

    /**
     * Creates a new post from the specified revision
     * 
     * @param {string} key 
     * @returns {Promise} - the new post model
     */
    async restore(key) {
        try {
            const revision = this.find(key);
            let authors = [];
            if (revision.authors) {
                for (const author of revision.authors) {
                    const authorModel = await this.store.queryRecord('user', {id: author.id});
                    authors.push(authorModel);
                }
            }
            let post = this.store.createRecord('post', {
                title: `(Restored) ${revision.title}`,
                lexical: revision.lexical,
                authors,
                type: revision.type,
                slug: revision.slug || 'untitled',
                status: 'draft',
                tags: revision.tags || [],
                post_revisions: []
            });
            await post.save();
            const location = window.location;
            const url = `${location.origin}${location.pathname}#/editor/${post.get('type')}/${post.id}`;
            // eslint-disable-next-line no-console
            console.log('Post restored: ', url);
            return post;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(err);
        }
    }

    /**
     * Filters revisions to keep only the most recent 5 for a given post ID
     * @param {string} postId - ID of the post to filter revisions for
     */
    filterRevisions(postId) {
        if (postId === 'draft') {
            return; // Ignore filter for drafts
        }

        const allRevisions = this.findAll(`${this._prefix}-${postId}`);
        if (allRevisions.length > 5) {
            const revisionsToRemove = allRevisions.slice(5);
            revisionsToRemove.forEach((revision) => {
                this.remove(revision.key);
            });
        }
    }
}