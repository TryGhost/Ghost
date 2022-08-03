import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class Recents extends Component {
    @service store;
    @service dashboardStats;

    @tracked selected = 'posts';
    @tracked posts = [];
    
    @action 
    async loadPosts() {
        this.posts = await this.store.query('post', {limit: 5, filter: 'status:[published,sent]', order: 'published_at desc'});
    }

    @action
    changeTabToPosts() {
        this.selected = 'posts';
    }

    @action
    changeTabToActivity() {
        this.selected = 'activity';
    }

    get postsTabSelected() {
        return (this.selected === 'posts');
    }

    get activityTabSelected() {
        return (this.selected === 'activity');
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }
}
