import Service from '@ember/service';
import {inject as service} from '@ember/service';
export default class MembersUtilsService extends Service {
    @service config;
    @service settings;

    get isMembersEnabled() {
        return this.settings.get('membersSignupAccess') !== 'none';
    }

    get isStripeEnabled() {
        const stripeDirect = this.config.get('stripeDirect');

        const hasDirectKeys = !!this.settings.get('stripeSecretKey') && !!this.settings.get('stripePublishableKey');
        const hasConnectKeys = !!this.settings.get('stripeConnectSecretKey') && !!this.settings.get('stripeConnectPublishableKey');

        if (stripeDirect) {
            return hasDirectKeys;
        }

        return hasConnectKeys || hasDirectKeys;
    }

    // Button / Icon helpers ---------------------------------------------------

    get defaultButtonIcons() {
        return [
            {
                icon: 'portal-icon-1',
                value: 'icon-1'
            },
            {
                icon: 'portal-icon-2',
                value: 'icon-2'
            },
            {
                icon: 'portal-icon-3',
                value: 'icon-3'
            },
            {
                icon: 'portal-icon-4',
                value: 'icon-4'
            },
            {
                icon: 'portal-icon-5',
                value: 'icon-5'
            }
        ];
    }

    get defaultIconKeys() {
        return this.defaultButtonIcons.map(buttonIcon => buttonIcon.value);
    }

    get buttonIcon() {
        return this.settings.get('portalButtonIcon') || this.defaultIconKeys[0];
    }

    // Plan helpers ------------------------------------------------------------

    get isFreeChecked() {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return !!(this.settings.get('membersSignupAccess') === 'all' && allowedPlans.includes('free'));
    }

    get isMonthlyChecked() {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return !!(this.isStripeConfigured && allowedPlans.includes('monthly'));
    }

    get isYearlyChecked() {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return !!(this.isStripeConfigured && allowedPlans.includes('yearly'));
    }

    // Portal preview ----------------------------------------------------------

    getPortalPreviewUrl(overrides) {
        const {
            disableBackground = false,
            page = 'signup',
            button = this.settings.get('portalButton'),
            buttonIcon = this.buttonIcon,
            isFreeChecked = this.isFreeChecked,
            isMonthlyChecked = this.isMonthlyChecked,
            isYearlyChecked = this.isYearlyChecked,
            monthlyPrice,
            yearlyPrice,
            portalPlans = this.settings.get('portalPlans'),
            portalProducts = this.settings.get('portalProducts'),
            currency,
            membersSignupAccess = this.settings.get('membersSignupAccess')
        } = overrides;

        const baseUrl = this.config.get('blogUrl');
        const portalBase = '/#/portal/preview';
        const settingsParam = new URLSearchParams();
        const signupButtonText = this.settings.get('portalButtonSignupText') || '';
        const allowSelfSignup = membersSignupAccess === 'all' && (!this.isStripeEnabled || isFreeChecked);

        settingsParam.append('button', button);
        settingsParam.append('name', this.settings.get('portalName'));
        settingsParam.append('isFree', isFreeChecked);
        settingsParam.append('isMonthly', isMonthlyChecked);
        settingsParam.append('isYearly', isYearlyChecked);
        settingsParam.append('page', page);
        settingsParam.append('buttonIcon', encodeURIComponent(buttonIcon));
        settingsParam.append('signupButtonText', encodeURIComponent(signupButtonText));
        settingsParam.append('membersSignupAccess', membersSignupAccess);
        settingsParam.append('allowSelfSignup', allowSelfSignup);

        if (portalPlans) {
            settingsParam.append('portalPrices', encodeURIComponent(portalPlans));
        }

        if (portalProducts) {
            settingsParam.append('portalProducts', encodeURIComponent(portalProducts));
        }

        if (this.settings.get('accentColor') === '' || this.settings.get('accentColor')) {
            settingsParam.append('accentColor', encodeURIComponent(`${this.settings.get('accentColor')}`));
        }
        if (this.settings.get('portalButtonStyle')) {
            settingsParam.append('buttonStyle', encodeURIComponent(this.settings.get('portalButtonStyle')));
        }

        if (monthlyPrice) {
            settingsParam.append('monthlyPrice', monthlyPrice);
        }
        if (yearlyPrice) {
            settingsParam.append('yearlyPrice', yearlyPrice);
        }
        if (currency) {
            settingsParam.append('currency', currency);
        }

        if (disableBackground) {
            settingsParam.append('disableBackground', true);
        }

        return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
    }
}
