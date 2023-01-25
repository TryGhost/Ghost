import Component from '@ember/component';
import ThemeErrorsModal from '../modals/design/theme-errors';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import classic from 'ember-classic-decorator';
import envConfig from 'ghost-admin/config/environment';
import {action, computed} from '@ember/object';
import {and, empty, match, reads} from '@ember/object/computed';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

@classic
export default class Footer extends Component {
    @service session;
    @service router;
    @service whatsNew;
    @service feature;
    @service modals;
    @service themeManagement;
    @service dashboardStats;
    @service settings;
    @service membersUtils;

    @inject config;

    @and('config.clientExtensions.dropdown', 'session.user.isOwnerOnly')
        showDropdownExtension;

    @match('router.currentRouteName', /^settings/)
        isSettingsRoute;

    @reads('session.user.isAdmin')
        isAdminOrOwner;

    @empty('feature.accessibility.referralInviteDismissed')
        referralNotDismissedYet;

    @computed('envConfig.environment', 'membersUtils.isStripeEnabled', 'settings.stripeConnectLivemode')
    get stripeLiveModeEnabled() {
        const isDevModeEnabled = envConfig.environment !== 'production' && this.membersUtils.isStripeEnabled;
        const isLiveEnabled = this.settings.stripeConnectLivemode;
        return isDevModeEnabled || isLiveEnabled;
    }

    get showReferralInvite() {
        // Conditions to see the referral invite
        // 1. Needs to be Owner or Admin
        // 2. Stripe is live enabled
        // 3. MRR is > $100
        // 4. Notification has not yet been dismissed by the user
        return this.isAdminOrOwner && this.referralNotDismissedYet && this.stripeLiveModeEnabled && this.dashboardStats?.currentMRR / 100 >= 100;
    }

    @action
    openThemeErrors() {
        this.advancedModal = this.modals.open(ThemeErrorsModal, {
            title: 'Theme errors',
            canActivate: false,
            // Warnings will only be set for developers, otherwise it will always be empty
            warnings: this.themeManagement.activeTheme.warnings,
            errors: this.themeManagement.activeTheme.errors
        });
    }

    @action
    dismissReferralInvite(event) {
        event.preventDefault();
        event.stopPropagation();
        const key = 'referralInviteDismissed';
        const value = true;
        const options = {user: true};

        return this.feature.update(key, value, options);
    }

    get hasThemeErrors() {
        return this.themeManagement.activeTheme && this.themeManagement.activeTheme.errors.length;
    }

    // equivalent to "left: auto; right: -20px"
    userDropdownPosition(trigger, dropdown) {
        let {horizontalPosition, verticalPosition, style} = calculatePosition(...arguments);
        let {width: dropdownWidth} = dropdown.firstElementChild.getBoundingClientRect();

        style.right += (dropdownWidth - 20);
        style['z-index'] = '1100';

        return {horizontalPosition, verticalPosition, style};
    }
}
