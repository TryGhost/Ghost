import Service from '@ember/service';
import {ICON_MAPPING} from 'ghost-admin/components/modal-portal-settings';
import {inject as service} from '@ember/service';
export default class MembersUtilsService extends Service {
    @service config;
    @service settings;

    get isStripeEnabled() {
        const stripeDirect = this.config.get('stripeDirect');

        const hasDirectKeys = !!this.settings.get('stripeSecretKey') && !!this.settings.get('stripePublishableKey');
        const hasConnectKeys = !!this.settings.get('stripeConnectSecretKey') && !!this.settings.get('stripeConnectPublishableKey');

        if (stripeDirect) {
            return hasDirectKeys;
        }

        return hasConnectKeys || hasDirectKeys;
    }

    getPortalPreviewUrl(args) {
        let {
            disableBackground,
            buttonIcon,
            page = 'signup',
            isFree = true,
            isMonthly = true,
            isYearly = true,
            monthlyPrice,
            yearlyPrice,
            currency
        } = args;

        if (!buttonIcon) {
            const defaultIconKeys = ICON_MAPPING.map(icon => icon.value);
            buttonIcon = this.settings.get('portalButtonIcon') || defaultIconKeys[0];
        }

        const baseUrl = this.config.get('blogUrl');
        const portalBase = '/#/portal/preview';
        const settingsParam = new URLSearchParams();
        const signupButtonText = this.settings.get('portalButtonSignupText') || '';

        settingsParam.append('button', this.settings.get('portalButton'));
        settingsParam.append('name', this.settings.get('portalName'));
        settingsParam.append('isFree', isFree);
        settingsParam.append('isMonthly', isMonthly);
        settingsParam.append('isYearly', isYearly);
        settingsParam.append('page', page);
        settingsParam.append('buttonIcon', encodeURIComponent(buttonIcon));
        settingsParam.append('signupButtonText', encodeURIComponent(signupButtonText));

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
