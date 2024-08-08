import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PostsList extends Component {
    @service store;

    @tracked showPublishFlowModal = false;
    latestScheduledPost = null;

    constructor() {
        super(...arguments);
        this.checkPublishFlowModal();
    }

    async checkPublishFlowModal() {
        if (localStorage.getItem('ghost-last-scheduled-post')) {
            await this.getLatestScheduledPost.perform();
            this.showPublishFlowModal = true;
            localStorage.removeItem('ghost-last-scheduled-post');
        }
    }

    get list() {
        return this.args.list;
    }

    @action
    togglePublishFlowModal() {
        this.showPublishFlowModal = !this.showPublishFlowModal;
    }

    @task
    *getLatestScheduledPost() {
        const result = yield this.store.query('post', {filter: `id:${localStorage.getItem('ghost-last-scheduled-post')}`, limit: 1});
        this.latestScheduledPost = result.toArray()[0];
    }
}
