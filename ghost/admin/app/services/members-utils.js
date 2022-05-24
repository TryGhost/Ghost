import Service, {inject as service} from '@ember/service';

export default class MembersUtilsService extends Service {
    @service config;
    @service settings;
    @service feature;
    @service store;

    get isMembersEnabled() {
        return this.settings.get('membersEnabled');
    }

    get paidMembersEnabled() {
        return this.settings.get('paidMembersEnabled');
    }

    /**
     * Note: always use paidMembersEnabled! Only use this getter for the Stripe Connection UI.
     */
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
        let {
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
            portalTiers,
            currency,
            membersSignupAccess = this.settings.get('membersSignupAccess')
        } = overrides;

        const tiers = this.store.peekAll('tier') || [];

        portalTiers = portalTiers || tiers.filter((t) => {
            return t.visibility === 'public' && t.type === 'paid';
        }).map(t => t.id);

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

        if (portalTiers) {
            settingsParam.append('portalProducts', encodeURIComponent(portalTiers));
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

    getOfferPortalPreviewUrl(overrides) {
        const {
            disableBackground = false,
            name,
            code,
            displayTitle = '',
            displayDescription = '',
            type,
            cadence,
            amount = 0,
            duration,
            durationInMonths,
            currency = 'usd',
            status,
            tierId
        } = overrides;

        const baseUrl = this.config.get('blogUrl');
        const portalBase = '/#/portal/preview/offer';
        const settingsParam = new URLSearchParams();

        settingsParam.append('name', encodeURIComponent(name));
        settingsParam.append('code', encodeURIComponent(code));
        settingsParam.append('display_title', encodeURIComponent(displayTitle));
        settingsParam.append('display_description', encodeURIComponent(displayDescription));
        settingsParam.append('type', encodeURIComponent(type));
        settingsParam.append('cadence', encodeURIComponent(cadence));
        settingsParam.append('amount', encodeURIComponent(amount));
        settingsParam.append('duration', encodeURIComponent(duration));
        settingsParam.append('duration_in_months', encodeURIComponent(durationInMonths));
        settingsParam.append('currency', encodeURIComponent(currency));
        settingsParam.append('status', encodeURIComponent(status));
        settingsParam.append('tier_id', encodeURIComponent(tierId));

        if (disableBackground) {
            settingsParam.append('disableBackground', 'true');
        }

        return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
    }
}
