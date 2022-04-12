import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class RecentPosts extends Component {
    @service store;

    @tracked posts = [];
    
    @action 
    async loadPosts() {
        this.posts = await this.store.query('post', {limit: 3, filter: 'status:published', order: 'published_at desc'});
    }
}
