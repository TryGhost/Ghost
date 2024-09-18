import Service from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
    }

    _prefix = 'post-revision';
    MIN_REVISION_TIME = 60000; // 1 minute in milliseconds
    lastRevisionTime = null;

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

    @task({drop: true})
    *saveRevisionTask(data) {
        const currentTime = Date.now();
        if (!this.lastRevisionTime || currentTime - this.lastRevisionTime >= this.MIN_REVISION_TIME) {
            yield this.performSaveRevision(data);
            this.lastRevisionTime = currentTime;
        } else {
            const waitTime = this.MIN_REVISION_TIME - (currentTime - this.lastRevisionTime);
            yield timeout(waitTime);
            yield this.performSaveRevision(data);
            this.lastRevisionTime = Date.now();
        }
    }

    performSaveRevision(data) {
        const key = this.generateKey(data);
        const keys = this._getKeys();
        keys.push(key);
        localStorage.setItem('revisions', JSON.stringify(keys));
        localStorage.setItem(key, JSON.stringify(data));
    }

    // Use this method to trigger the revision save
    scheduleRevisionSave(data) {
        this.saveRevisionTask.perform(data);
    }

    findOne(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    findAll() {
        const keys = this._getKeys();
        const revisions = [];
        for (let key of keys) {
            revisions[key] = this.findOne(key);
        }
        return revisions;
    }

    findByPostId(postId = 'draft') {
        const keys = this._getKeys();
        const revisions = [];
        for (let key of keys) {
            if (key.includes(postId)) {
                revisions[key] = this.findOne(key);
            }
        }
        return revisions;
    }

    _getKeys() {
        const keys = JSON.parse(localStorage.getItem('revisions') || '[]');
        return keys;
    }
}