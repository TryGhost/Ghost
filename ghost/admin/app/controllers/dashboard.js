import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class DashboardController extends Controller {
    @service feature;
    @service session;
    @service membersStats;
    @service store;
    @service settings;
    @service whatsNew;

    @tracked whatsNewEntries = null;
    @tracked whatsNewEntriesLoading = null;
    @tracked whatsNewEntriesError = null;

    get showMembersData() {
        return this.settings.get('membersSignupAccess') !== 'none';
    }

    get showMembersGraphs() {
        if (!this.feature.improvedOnboarding) {
            return this.showMembersData;
        }

        const hasMembers = this.store.peekAll('member').length > 0;

        return this.showMembersData
            && this.checkMemberCountTask.performCount > 0
            && hasMembers;
    }

    initialise() {
        if (!this.feature.get('dashboardV5')) {
            this.loadWhatsNew();
            this.checkMemberCountTask.perform();
        }
    }

    loadWhatsNew() {
        this.whatsNewEntriesLoading = true;
        this.whatsNew.fetchLatest.perform().then(() => {
            this.whatsNewEntriesLoading = false;
            this.whatsNewEntries = this.whatsNew.entries.slice(0, 3);
        }, (error) => {
            this.whatsNewEntriesError = error;
            this.whatsNewEntriesLoading = false;
        });
    }

    @action
    dismissLaunchBanner() {
        this.settings.set('editorIsLaunchComplete', true);
        this.settings.save();
    }

    @task
    *checkMemberCountTask() {
        if (this.store.peekAll('member').length === 0) {
            yield this.store.query('member', {limit: 1});
        }
    }
}
