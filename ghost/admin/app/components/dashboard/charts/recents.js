import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class Recents extends Component {
    @service store;
    @service dashboardStats;

    @tracked selected = 'posts';
    @tracked posts = [];
    excludedEventTypes = ['aggregated_click_event'];

    @action
    async loadData() {
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

    @action
    changeTabToMentions() {
        this.selected = 'mentions';
    }

    get postsTabSelected() {
        return (this.selected === 'posts');
    }

    get activityTabSelected() {
        return (this.selected === 'activity');
    }

    get mentionsTabSelected() {
        return (this.selected === 'mentions');
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }
}
