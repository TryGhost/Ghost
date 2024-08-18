import Component from '@glimmer/component';
import PostSuccessModal from '../modal-post-success';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class PostsList extends Component {
    @service store;
    @service modals;
    @service feature;

    latestScheduledPost = null;

    constructor() {
        super(...arguments);
        if (this.feature.publishFlowEndScreen) {
            this.checkPublishFlowModal();
        }
    }

    async checkPublishFlowModal() {
        if (localStorage.getItem('ghost-last-scheduled-post')) {
            await this.getLatestScheduledPost.perform();
            this.modals.open(PostSuccessModal, {
                post: this.latestScheduledPost
            });
            localStorage.removeItem('ghost-last-scheduled-post');
        }
    }

    get list() {
        return this.args.list;
    }

    @task
    *getLatestScheduledPost() {
        const result = yield this.store.query('post', {filter: `id:${localStorage.getItem('ghost-last-scheduled-post')}`, limit: 1});
        this.latestScheduledPost = result.toArray()[0];
    }
}
