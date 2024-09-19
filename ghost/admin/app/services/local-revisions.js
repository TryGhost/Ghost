import Service from '@ember/service';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
    }

    // base key prefix to avoid collisions in localStorage
    _prefix = 'post-revision';

    // key to store a simple index of all revisions
    _indexKey = 'ghost-revisions';

    // only save important fields since localStorage quotas are limited
    _fieldsToSave = ['id', 'lexical', 'title', 'customExcerpt'];

    generateKey(data) {
        const timestamp = new Date().getTime();
        return `${this._prefix}-${data.id}-${timestamp}`;
    }

    save(post) {
        try {
            const data = {
                id: post.id || 'draft',
                lexical: post.get('lexical'),
                title: post.get('title'),
                customExcerpt: post.get('customExcerpt')
            };
            const key = this.generateKey(data);
            const allKeys = this.keys();
            allKeys.push(key);
            localStorage.setItem(this._indexKey, JSON.stringify(allKeys));
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                // evict old revisions and retry save here
            }
        }
    }

    find(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    findAll() {
        const keys = this.keys();
        const revisions = {};
        for (const key of keys) {
            revisions[key] = JSON.parse(localStorage.getItem(key));
        }
        return revisions;
    }

    findByPostId(postId = undefined) {
        const prefix = this._prefix;
        const keyPrefix = postId ? `${prefix}-${postId}` : `${prefix}-draft`;
        const keys = this.keys();
        const filteredKeys = keys.filter(key => key.startsWith(keyPrefix));
        const revisions = [];
        for (const key of filteredKeys) {
            revisions.push(this.find(key));
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

    clear() {
        const keys = this.keys();
        for (const key of keys) {
            this.remove(key);
        }
    }

    keys() {
        return JSON.parse(localStorage.getItem(this._indexKey) || '[]');
    }
}