import Component from '@glimmer/component';
import envConfig from 'ghost-admin/config/environment';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class GhReferralInvite extends Component {
    @service session;
    @service dashboardStats;
    @service feature;
    @service membersUtils;
    @service settings;

    constructor() {
        super(...arguments);
        this.loadCurrentMRR.perform();
    }

    get isAdminOrOwner() {
        return this.session.user.isAdmin;
    }

    get isReferralNotificationNotDismissed() {
        return !this.feature.accessibility.referralInviteDismissed;
    }

    get stripeLiveModeEnabled() {
        // allow testing mode when not in a production environment
        const isDevModeStripeEnabled = envConfig.environment !== 'production' && this.membersUtils.isStripeEnabled;
        const isLiveEnabled = this.settings.stripeConnectLivemode;
        return isDevModeStripeEnabled || isLiveEnabled;
    }

    get hasReachedMRR() {
        return this.dashboardStats.currentMRR / 100 >= 100;
    }

    get showReferralInvite() {
        // Conditions to see the referral invite
        // 1. Needs to be Owner or Admin
        // 2. Stripe is setup and enabled in live mode
        // 3. MRR is > $100
        // 4. Notification has not yet been dismissed by the user
        return !this.args.hasThemeErrors && this.isAdminOrOwner && this.isReferralNotificationNotDismissed && this.stripeLiveModeEnabled && this.hasReachedMRR;
    }

    @task
    *loadCurrentMRR() {
        if (this.isAdminOrOwnern) {
            try {
                yield this.dashboardStats.loadMrrStats();
            } catch (error) {
                // noop
            }
        }
    }

    @action
    dismissReferralInvite(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.feature.referralInviteDismissed) {
            this.feature.referralInviteDismissed = moment().tz(this.settings.timezone);
        }
    }
}
