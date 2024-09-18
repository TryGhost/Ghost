import Service from '@ember/service';
import { task, timeout } from 'ember-concurrency';

export default class LocalRevisionsService extends Service {
    constructor() {
        super(...arguments);
        this.revisions = {};
    }

    _prefix = 'post-revision';
    MIN_REVISION_TIME = 60000; // 1 minute in milliseconds
    lastRevisionTime = null;

    generateKey(data) {
        const timestamp = new Date().getTime();
        let key = this._prefix;
        if (data && data.post && data.post.id) {
            key = `${key}-${data.post.id}`;
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
        console.log('Saving local revision with data: ', data);
        const key = this.generateKey(data);
        this.revisions[key] = data;
        console.log('Local revisions: ', this.getLocalRevisions());
    }

    // Use this method to trigger the revision save
    scheduleRevisionSave(data) {
        this.saveRevisionTask.perform(data);
    }

    getRevision(key) {
        console.log('Getting local revision with key: ', key);
        return this.revisions[key];
    }

    getLocalRevisions() {
        console.log('Getting local revisions');
        return this.revisions;
    }
}