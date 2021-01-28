import Service from '@ember/service';
import {ICON_MAPPING} from 'ghost-admin/components/modal-portal-settings';
import {inject as service} from '@ember/service';

export default class PortalService extends Service {
    @service config;
    @service settings;

    getPreviewUrl(args) {
        let {
            buttonIcon,
            page = 'signup',
            isFreeChecked = true,
            isMonthlyChecked = true,
            isYearlyChecked = true,
            monthlyPrice,
            yearlyPrice
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
        settingsParam.append('isFree', isFreeChecked);
        settingsParam.append('isMonthly', isMonthlyChecked);
        settingsParam.append('isYearly', isYearlyChecked);
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
            settingsParam.append('yearlyPrice', monthlyPrice);
        }

        return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
    }
}
