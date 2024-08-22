import Component from '@glimmer/component';
import PostSuccessModal from '../modal-post-success';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class PostsList extends Component {
    @service store;
    @service modals;
    @service feature;

    latestScheduledPost = null;
    latestPublishedPost = null;

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

        if (localStorage.getItem('ghost-last-published-post')) {
            await this.getlatestPublishedPost.perform();
            this.modals.open(PostSuccessModal, {
                post: this.latestPublishedPost
            });
            localStorage.removeItem('ghost-last-published-post');
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

    @task
    *getlatestPublishedPost() {
        const result = yield this.store.query('post', {filter: `id:${localStorage.getItem('ghost-last-published-post')}`, limit: 1});
        this.latestPublishedPost = result.toArray()[0];
    }
}
