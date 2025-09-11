import Component from '@glimmer/component';
import envConfig from 'ghost-admin/config/environment';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {loadDashboardMockState} from '../../utils/load-dashboard-mock-state';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class FooterBanner extends Component {
    @service session;
    @service dashboardStats;
    @service dashboardMocks;
    @service feature;
    @service membersUtils;
    @service modals;
    @service settings;
    @service whatsNew;

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

    get showWhatsNew() {
        return !this.showReferralInvite && this.whatsNew.hasNewFeatured;
    }

    @task
    *loadCurrentMRR() {
        if (this.isAdminOrOwner) {
            // If Mocks are enabled on the Dashboard control panel, then update mocked data.
            if (envConfig.environment !== 'production') {
                const {savedState, savedStatus, enabledStr} = loadDashboardMockState();

                if (savedState) {
                    this.dashboardMocks.updateMockedData(savedState);
                }

                if (savedStatus) {
                    this.dashboardMocks.siteStatus = {...this.dashboardMocks.siteStatus, ...savedStatus};
                }

                if (typeof enabledStr === 'boolean' && enabledStr !== this.dashboardMocks.enabled) {
                    this.dashboardMocks.enabled = enabledStr;
                }
            }

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

    @action
    dismissWhatsNewToast(event) {
        event.preventDefault();
        event.stopPropagation();

        // Dismiss
        this.whatsNew.seen();
    }

    @action
    openFeaturedWhatsNew(href) {
        window.open(href, '_blank');
        this.whatsNew.seen();
    }
}
