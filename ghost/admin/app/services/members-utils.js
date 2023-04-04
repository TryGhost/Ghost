import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';

export default class MembersUtilsService extends Service {
    @service settings;
    @service feature;
    @service session;
    @service store;

    @inject config;

    paidTiers = null;

    get isMembersEnabled() {
        return this.settings.membersEnabled;
    }

    get paidMembersEnabled() {
        return this.settings.paidMembersEnabled;
    }

    get isMembersInviteOnly() {
        return this.settings.membersInviteOnly;
    }

    get hasMultipleTiers() {
        return this.paidMembersEnabled && this.paidTiers && this.paidTiers.length > 1;
    }

    get hasActiveTiers() {
        return this.paidMembersEnabled && this.paidTiers && this.paidTiers.length > 0;
    }

    async fetch() {
        if (this.paidTiers !== null) {
            return;
        }

        // contributors don't have permissions to fetch tiers
        if (this.session.user && !this.session.user.isContributor) {
            return this.store.query('tier', {filter: 'type:paid+active:true', limit: 'all'}).then((tiers) => {
                this.paidTiers = tiers;
            });
        }
    }

    async reload() {
        // contributors don't have permissions to fetch tiers
        if (this.session.user && !this.session.user.isContributor) {
            return this.store.query('tier', {filter: 'type:paid+active:true', limit: 'all'}).then((tiers) => {
                this.paidTiers = tiers;
            });
        }
    }

    /**
     * Note: always use paidMembersEnabled! Only use this getter for the Stripe Connection UI.
     */
    get isStripeEnabled() {
        const stripeDirect = this.config.stripeDirect;

        const hasDirectKeys = !!this.settings.stripeSecretKey && !!this.settings.stripePublishableKey;
        const hasConnectKeys = !!this.settings.stripeConnectSecretKey && !!this.settings.stripeConnectPublishableKey;

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
        return this.settings.portalButtonIcon || this.defaultIconKeys[0];
    }

    // Plan helpers ------------------------------------------------------------

    get isFreeChecked() {
        const allowedPlans = this.settings.portalPlans || [];
        return !!(this.settings.membersSignupAccess === 'all' && allowedPlans.includes('free'));
    }

    get isMonthlyChecked() {
        const allowedPlans = this.settings.portalPlans || [];
        return !!(this.isStripeConfigured && allowedPlans.includes('monthly'));
    }

    get isYearlyChecked() {
        const allowedPlans = this.settings.portalPlans || [];
        return !!(this.isStripeConfigured && allowedPlans.includes('yearly'));
    }

    // Portal preview ----------------------------------------------------------

    getPortalPreviewUrl(overrides) {
        let {
            disableBackground = false,
            page = 'signup',
            button = this.settings.portalButton,
            buttonIcon = this.buttonIcon,
            isFreeChecked = this.isFreeChecked,
            isMonthlyChecked = this.isMonthlyChecked,
            isYearlyChecked = this.isYearlyChecked,
            monthlyPrice,
            yearlyPrice,
            portalPlans = this.settings.portalPlans,
            portalTiers,
            currency,
            membersSignupAccess = this.settings.membersSignupAccess
        } = overrides;

        const tiers = this.store.peekAll('tier') || [];

        portalTiers = portalTiers || tiers.filter((t) => {
            return t.visibility === 'public' && t.type === 'paid';
        }).map(t => t.id);

        const baseUrl = this.config.blogUrl;
        const portalBase = '/#/portal/preview';
        const settingsParam = new URLSearchParams();
        const signupButtonText = this.settings.portalButtonSignupText || '';
        const allowSelfSignup = membersSignupAccess === 'all' && (!this.isStripeEnabled || isFreeChecked);

        settingsParam.append('button', button);
        settingsParam.append('name', this.settings.portalName);
        settingsParam.append('isFree', isFreeChecked);
        settingsParam.append('isMonthly', isMonthlyChecked);
        settingsParam.append('isYearly', isYearlyChecked);
        settingsParam.append('page', page);
        settingsParam.append('buttonIcon', encodeURIComponent(buttonIcon));
        settingsParam.append('signupButtonText', encodeURIComponent(signupButtonText));
        settingsParam.append('membersSignupAccess', membersSignupAccess);
        settingsParam.append('allowSelfSignup', allowSelfSignup);
        settingsParam.append('signupTermsHtml', this.settings.portalSignupTermsHtml || '');
        settingsParam.append('signupCheckboxRequired', this.settings.portalSignupCheckboxRequired);

        if (portalPlans) {
            settingsParam.append('portalPrices', encodeURIComponent(portalPlans));
        }

        if (portalTiers) {
            settingsParam.append('portalProducts', encodeURIComponent(portalTiers));
        }

        if (this.settings.accentColor === '' || this.settings.accentColor) {
            settingsParam.append('accentColor', encodeURIComponent(`${this.settings.accentColor}`));
        }
        if (this.settings.portalButtonStyle) {
            settingsParam.append('buttonStyle', encodeURIComponent(this.settings.portalButtonStyle));
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

        const baseUrl = this.config.blogUrl;
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
