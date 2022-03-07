import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardController extends Controller {
    @service feature;
    @service session;
    @service membersStats;
    @service store;
    @service settings;
    @service whatsNew;

    @tracked topMembersData = null;
    @tracked topMembersError = null;
    @tracked topMembersLoading = false;

    @tracked whatsNewEntries = null;
    @tracked whatsNewEntriesLoading = null;
    @tracked whatsNewEntriesError = null;

    get topMembersDataHasOpenRates() {
        return this.topMembersData && this.topMembersData.find((member) => {
            return member.emailOpenRate !== null;
        });
    }

    get showMembersData() {
        return this.settings.get('membersSignupAccess') !== 'none';
    }

    initialise() {
        this.loadTopMembers();
        this.loadWhatsNew();
    }

    loadTopMembers() {
        if (this.feature.membersActivityFeed) {
            return;
        }

        this.topMembersLoading = true;
        let query = {
            filter: 'email_open_rate:-null',
            order: 'email_open_rate desc',
            limit: 5
        };
        this.store.query('member', query).then((result) => {
            if (!result.length) {
                return this.store.query('member', {
                    filter: 'status:paid',
                    order: 'created_at asc',
                    limit: 5
                });
            }
            return result;
        }).then((result) => {
            this.topMembersData = result;
            this.topMembersLoading = false;
        }).catch((error) => {
            this.topMembersError = error;
            this.topMembersLoading = false;
        });
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
}
