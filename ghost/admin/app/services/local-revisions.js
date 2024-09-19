import Service from '@ember/service';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
    }

    _prefix = 'post-revision';

    generateKey(data) {
        const timestamp = new Date().getTime();
        let key = this._prefix;
        if (data && data.id) {
            key = `${key}-${data.id}`;
        } else {
            key = `${key}-draft`;
        }
        return `${key}-${timestamp}`;
    }

    save(data) {
        try {
            const key = this.generateKey(data);
            const revisions = JSON.parse(localStorage.getItem('ghost-revisions') || '[]');
            revisions.push(key);
            localStorage.setItem('ghost-revisions', JSON.stringify(revisions));
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.warn('Quota Exceeded');
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
}