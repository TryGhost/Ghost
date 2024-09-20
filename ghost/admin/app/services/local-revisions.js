import Service, {inject as service} from '@ember/service';
import config from 'ghost-admin/config/environment';
import {task, timeout} from 'ember-concurrency';
export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
        this.MIN_REVISION_TIME = this.isTesting ? 50 : 60000; // 1 minute in ms
        this.performSave = this.performSave.bind(this);
    }

    @service store;

    // base key prefix to avoid collisions in localStorage
    _prefix = 'post-revision';

    latestRevisionTime = null;

    // key to store a simple index of all revisions
    _indexKey = 'ghost-revisions';

    generateKey(data) {
        return `${this._prefix}-${data.id}-${data.revisionTimestamp}`;
    }

    @task({keepLatest: true})
    *saveTask(type, data) {
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
    }

    performSave(type, data) {
        data.id = data.id || 'draft';
        data.type = type;
        data.revisionTimestamp = Date.now();
        const key = this.generateKey(data);
        try {
            const allKeys = this.keys();
            allKeys.push(key);
            localStorage.setItem(this._indexKey, JSON.stringify(allKeys));
            localStorage.setItem(key, JSON.stringify(data));
            return key;
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                // Remove the current key in case it's already in the index
                this.remove(key);
                
                // If there are any revisions, remove the oldest one and try to save again
                if (this.keys().length) {
                    this.removeOldest();
                    return this.performSave(type, data);
                }
                // LocalStorage is full and there are no revisions to remove
                // We can't save the revision
            }
        }
    }

    // Use this method to trigger the revision save
    scheduleSave(type, data) {
        this.saveTask.perform(type, data);
    }

    find(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    findAll(prefix = undefined) {
        const keys = this.keys(prefix);
        const revisions = {};
        for (const key of keys) {
            revisions[key] = JSON.parse(localStorage.getItem(key));
        }
        return revisions;
    }

    remove(key) {
        localStorage.removeItem(key);
        const keys = this.keys();
        let index = keys.indexOf(key);
        if (index !== -1) {
            keys.splice(index, 1);
        }
        localStorage.setItem(this._indexKey, JSON.stringify(keys));
    }

    removeOldest() {
        const keys = this.keys();
        const keysByTimestamp = keys.map(key => ({key, timestamp: this.find(key).revisionTimestamp}));
        keysByTimestamp.sort((a, b) => a.timestamp - b.timestamp);
        this.remove(keysByTimestamp[0].key);
    }

    clear() {
        const keys = this.keys();
        for (const key of keys) {
            this.remove(key);
        }
    }

    keys(prefix = undefined) {
        let keys = JSON.parse(localStorage.getItem(this._indexKey) || '[]');
        if (prefix) {
            keys = keys.filter(key => key.startsWith(prefix));
        }
        return keys;
    }

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

    // Take a revision from localStorage and create a post with its data
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
}