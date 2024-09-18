import Service, {inject as service} from '@ember/service';

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
        }
        return `${key}-${timestamp}`;
    }

    saveRevision(data) {
        console.log('Saving local revision with data: ', data);
        const key = this.generateKey(data);
        this.revisions[key] = data;
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