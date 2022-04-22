import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class Recents extends Component {
    @service store;
    @service feature;
    @service session;
    @service settings;
    @service dashboardStats;

    @tracked selected = 'posts';

    @tracked posts = [];
    
    @action 
    async loadPosts() {
        this.posts = await this.store.query('post', {limit: 5, filter: 'status:published', order: 'published_at desc'});
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

    get shouldDisplay() {
        if (this.feature.improvedOnboarding) {
            return true;
        }

        const isOwner = this.session.user?.isOwnerOnly;
        const hasCompletedLaunchWizard = this.settings.get('editorIsLaunchComplete');

        if (isOwner && !hasCompletedLaunchWizard) {
            return false;
        }

        return true;
    }

    get areMembersEnabled() {
        const enabled = this.dashboardStats.siteStatus?.membersEnabled;
        return enabled;
    }
}
