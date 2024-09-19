import Service, {inject as service} from '@ember/service';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
        this.save = this.save.bind(this);
    }

    @service store;

    // base key prefix to avoid collisions in localStorage
    _prefix = 'post-revision';

    // key to store a simple index of all revisions
    _indexKey = 'ghost-revisions';

    generateKey(data) {
        return `${this._prefix}-${data.id}-${data.revisionTimestamp}`;
    }

    save(type, data) {
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
                // Remove the oldest revision to make space
                this.removeOldest();
                // Try to save again
                return this.save(type, data);
            }
        }
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
        const keys = this.keys();
        let index = keys.indexOf(key);
        if (index !== -1) {
            keys.splice(index, 1);
        }
        localStorage.setItem(this._indexKey, JSON.stringify(keys));
        localStorage.removeItem(key);
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

    showRevisions() {
        const revisions = this.findAll();
        const tableData = [];
        for (const [key, revision] of Object.entries(revisions)) {
            tableData.push({
                key,
                timestamp: revision.revisionTimestamp,
                time: new Date(revision.revisionTimestamp).toLocaleString(),
                title: revision.title,
                type: revision.type
            });
        }
        tableData.sort((a, b) => b.timestamp - a.timestamp);
        for (const row of tableData) {
            // eslint-disable-next-line no-console
            console.log(row.key, row.time, row.title, row.type, row.plaintext);
        }
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