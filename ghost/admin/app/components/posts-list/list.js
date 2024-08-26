import Component from '@glimmer/component';
import PostSuccessModal from '../modal-post-success';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PostsList extends Component {
    @service store;
    @service modals;
    @service feature;

    @tracked postCount = 0;

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
            await this.getPostCount.perform();
            this.modals.open(PostSuccessModal, {
                post: this.latestPublishedPost,
                postCount: this.postCount,
                showPostCount: true
            });
            localStorage.removeItem('ghost-last-published-post');
        }
    }

    get list() {
        return this.args.list;
    }

    @task
    *getLatestScheduledPost() {
        const post = JSON.parse(localStorage.getItem('ghost-last-scheduled-post'));
        const result = yield this.store.query(post.type, {filter: `id:${post.id}`, limit: 1});
        this.latestScheduledPost = result.toArray()[0];
    }

    @task
    *getlatestPublishedPost() {
        const post = JSON.parse(localStorage.getItem('ghost-last-published-post'));
        const result = yield this.store.query(post.type, {filter: `id:${post.id}`, limit: 1});
        this.latestPublishedPost = result.toArray()[0];
    }

    @task
    *getPostCount() {
        const result = yield this.store.query('post', {filter: 'status:published', limit: 1, page: 1});
        this.postCount = result.meta.pagination.total;
    }
}
