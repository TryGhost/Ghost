import Service from '@ember/service';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
    }

    // base key prefix to avoid collisions in localStorage
    _prefix = 'post-revision';

    // only save important fields since localStorage quotas are limited
    _fieldsToSave = ['id', 'lexical', 'title', 'customExcerpt'];

    generateKey(data) {
        const timestamp = new Date().getTime();
        return `${this._prefix}-${data.id}-${timestamp}`;
    }

    save(post) {
        const data = {
            id: post.id || 'draft',
            lexical: post.get('lexical'),
            title: post.get('title'),
            customExcerpt: post.get('customExcerpt')
        };
        try {
            const key = this.generateKey(data);
            const revisions = JSON.parse(localStorage.getItem('ghost-revisions') || '[]');
            revisions.push(key);
            localStorage.setItem('ghost-revisions', JSON.stringify(revisions));
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                // evict old revisions and retry save here
            }
        }
    }

    get(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    getAll() {
        const keys = JSON.parse(localStorage.getItem('ghost-revisions'));
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
        localStorage.setItem('ghost-revisions', JSON.stringify(keys));
        localStorage.removeItem(key);
    }

    getByPostId(postId = undefined) {
        const prefix = this._prefix;
        const keyPrefix = postId ? `${prefix}-${postId}` : `${prefix}-draft`;
        const keys = JSON.parse(localStorage.getItem('ghost-revisions'));
        const filteredKeys = keys.filter(key => key.startsWith(keyPrefix));
        const revisions = [];
        for (const key of filteredKeys) {
            revisions.push(JSON.parse(localStorage.getItem(key)));
        }
        return revisions;
    }

    clear() {
        const keys = JSON.parse(localStorage.getItem('ghost-revisions') || '[]');
        for (const key of keys) {
            localStorage.removeItem(key);
        }
        localStorage.removeItem('ghost-revisions');
    }

    keys() {
        return JSON.parse(localStorage.getItem('ghost-revisions' || '[]'));
    }
}