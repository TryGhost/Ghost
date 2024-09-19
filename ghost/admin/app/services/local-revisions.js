import Service from '@ember/service';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
        this.revisions = {};
    }

    _prefix = 'post-revision';

    generateKey(data) {
        const timestamp = new Date().getTime();
        let key = this._prefix;
        if (data && data.post && data.post.id) {
            key = `${key}-${data.post.id}`;
        } else {
            key = `${key}-draft`;
        }
        return `${key}-${timestamp}`;
    }

    save(data) {
        const key = this.generateKey(data);
        this.revisions[key] = data;
    }

    get(key) {
        return this.revisions[key];
    }

    getAll() {
        return this.revisions;
    }

    getByPostId(postId = undefined) {
        const prefix = this._prefix;
        const keyPrefix = postId ? `${prefix}-${postId}` : `${prefix}-draft`;
        return Object.keys(this.revisions).reduce((acc, key) => {
            if (key.indexOf(keyPrefix) === 0) {
                acc[key] = this.revisions[key];
            }
            return acc;
        }, {});
    }
}