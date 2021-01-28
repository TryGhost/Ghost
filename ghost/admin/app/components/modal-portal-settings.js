import $ from 'jquery';
import ModalComponent from 'ghost-admin/components/modal-base';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {alias, reads} from '@ember/object/computed';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
const ICON_EXTENSIONS = ['gif', 'jpg', 'jpeg', 'png', 'svg'];

export const ICON_MAPPING = [
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

export default ModalComponent.extend({
    config: service(),
    membersUtils: service(),
    portal: service(),
    settings: service(),

    page: 'signup',
    iconExtensions: null,
    defaultButtonIcons: null,
    isShowModalLink: true,
    customIcon: null,
    showLinksPage: false,
    showLeaveSettingsModal: false,
    freeSignupRedirect: undefined,
    paidSignupRedirect: undefined,

    confirm() {},

    allowSelfSignup: alias('settings.membersAllowFreeSignup'),

    isStripeConfigured: reads('membersUtils.isStripeEnabled'),

    buttonIcon: computed('settings.portalButtonIcon', function () {
        const defaultIconKeys = this.defaultButtonIcons.map(buttonIcon => buttonIcon.value);
        return (this.settings.get('portalButtonIcon') || defaultIconKeys[0]);
    }),

    backgroundStyle: computed('settings.accentColor', function () {
        let color = this.get('settings.accentColor') || '#ffffff';
        return htmlSafe(`background-color: ${color}`);
    }),

    showModalLinkOrAttribute: computed('isShowModalLink', function () {
        if (this.isShowModalLink) {
            return `#/portal`;
        }
        return `data-portal`;
    }),

    portalPreviewUrl: computed('buttonIcon', 'page', 'isFreeChecked', 'isMonthlyChecked', 'isYearlyChecked', 'settings.{portalName,portalButton,portalButtonSignupText,portalButtonStyle,accentColor}', function () {
        const options = this.getProperties(['buttonIcon', 'page', 'isFreeChecked', 'isMonthlyChecked', 'isYearlyChecked']);
        return this.portal.getPreviewUrl(options);
    }),

    showIconSetting: computed('selectedButtonStyle', function () {
        const selectedButtonStyle = this.get('selectedButtonStyle.name') || '';
        return selectedButtonStyle.includes('icon');
    }),

    showButtonTextSetting: computed('selectedButtonStyle', function () {
        const selectedButtonStyle = this.get('selectedButtonStyle.name') || '';
        return selectedButtonStyle.includes('text');
    }),

    isFreeChecked: computed('settings.portalPlans.[]', 'allowSelfSignup', function () {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return (this.allowSelfSignup && allowedPlans.includes('free'));
    }),

    isMonthlyChecked: computed('settings.portalPlans.[]', 'isStripeConfigured', function () {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return (this.isStripeConfigured && allowedPlans.includes('monthly'));
    }),

    isYearlyChecked: computed('settings.portalPlans.[]', 'isStripeConfigured', function () {
        const allowedPlans = this.settings.get('portalPlans') || [];
        return (this.isStripeConfigured && allowedPlans.includes('yearly'));
    }),

    selectedButtonStyle: computed('settings.portalButtonStyle', function () {
        return this.buttonStyleOptions.find((buttonStyle) => {
            return (buttonStyle.name === this.settings.get('portalButtonStyle'));
        });
    }),

    init() {
        this._super(...arguments);
        this.set('hidePreviewFrame', true);
        this.buttonStyleOptions = [
            {name: 'icon-and-text', label: 'Icon and text'},
            {name: 'icon-only', label: 'Icon only'},
            {name: 'text-only', label: 'Text only'}
        ];
        this.defaultButtonIcons = ICON_MAPPING;
        this.iconExtensions = ICON_EXTENSIONS;
        const portalButtonIcon = this.settings.get('portalButtonIcon') || '';
        const defaultIconKeys = this.defaultButtonIcons.map(buttonIcon => buttonIcon.value);
        if (portalButtonIcon && !defaultIconKeys.includes(portalButtonIcon)) {
            this.set('customIcon', this.settings.get('portalButtonIcon'));
        }

        this.siteUrl = this.config.get('blogUrl');
    },

    didInsertElement() {
        this._super(...arguments);
        this.get('settings.errors').clear();
        run.later(this, function () {
            this.set('hidePreviewFrame', false);
        }, 1200);
    },

    actions: {
        toggleFreePlan(isChecked) {
            this.updateAllowedPlan('free', isChecked);
        },
        toggleMonthlyPlan(isChecked) {
            this.updateAllowedPlan('monthly', isChecked);
        },
        toggleYearlyPlan(isChecked) {
            this.updateAllowedPlan('yearly', isChecked);
        },
        togglePortalButton(showButton) {
            this.settings.set('portalButton', showButton);
        },

        togglePortalName(showSignupName) {
            this.settings.set('portalName', showSignupName);
        },

        setPaidSignupRedirect(url) {
            this.set('paidSignupRedirect', url);
        },

        setFreeSignupRedirect(url) {
            this.set('freeSignupRedirect', url);
        },

        confirm() {
            return this.saveTask.perform();
        },

        isPlanSelected(plan) {
            const allowedPlans = this.settings.get('portalPlans');
            return allowedPlans.includes(plan);
        },

        switchPreviewPage(page) {
            if (page === 'links') {
                this.set('showLinksPage', true);
                this.set('page', '');
            } else {
                this.set('showLinksPage', false);
                this.set('page', page);
            }
        },

        switchToSignupPage() {
            if (this.showLinksPage) {
                this.set('showLinksPage', false);
                this.set('page', 'signup');
            }
        },

        setButtonStyle(buttonStyle) {
            this.settings.set('portalButtonStyle', buttonStyle.name);
        },
        setSignupButtonText(event) {
            this.settings.set('portalButtonSignupText', event.target.value);
        },
        /**
         * Fired after an image upload completes
         * @param  {string} property - Property name to be set on `this.settings`
         * @param  {UploadResult[]} results - Array of UploadResult objects
         * @return {string} The URL that was set on `this.settings.property`
         */
        imageUploaded(property, results) {
            if (results[0]) {
                this.set('customIcon', results[0].url);
                this.settings.set('portalButtonIcon', results[0].url);
            }
        },
        /**
         * Opens a file selection dialog - Triggered by "Upload Image" buttons,
         * searches for the hidden file input within the .gh-setting element
         * containing the clicked button then simulates a click
         * @param  {MouseEvent} event - MouseEvent fired by the button click
         */
        triggerFileDialog(event) {
            // simulate click to open file dialog
            // using jQuery because IE11 doesn't support MouseEvent
            $(event.target)
                .closest('.gh-setting-action')
                .find('input[type="file"]')
                .click();
        },

        deleteCustomIcon() {
            this.set('customIcon', null);
            const defaultIconKeys = ICON_MAPPING.map(buttonIcon => buttonIcon.value);
            this.settings.set('portalButtonIcon', defaultIconKeys[0]);
        },

        selectDefaultIcon(icon) {
            this.settings.set('portalButtonIcon', icon);
        },

        closeLeaveSettingsModal() {
            this.set('showLeaveSettingsModal', false);
        },

        openStripeSettings() {
            this.model.openStripeSettings();
            this.closeModal();
        },

        leaveSettings() {
            this.closeModal();
        },

        validateFreeSignupRedirect() {
            return this._validateSignupRedirect(this.get('freeSignupRedirect'), 'membersFreeSignupRedirect');
        },

        validatePaidSignupRedirect() {
            return this._validateSignupRedirect(this.get('paidSignupRedirect'), 'membersPaidSignupRedirect');
        }
    },

    updateAllowedPlan(plan, isChecked) {
        const allowedPlans = this.settings.get('portalPlans') || [];

        if (!isChecked) {
            this.settings.set('portalPlans', allowedPlans.filter(p => p !== plan));
        } else {
            allowedPlans.push(plan);
            this.settings.set('portalPlans', [...allowedPlans]);
        }
    },

    _validateSignupRedirect(url, type) {
        let errMessage = `Please enter a valid URL`;
        this.get('settings.errors').remove(type);
        this.get('settings.hasValidated').removeObject(type);

        if (url === null) {
            this.get('settings.errors').add(type, errMessage);
            this.get('settings.hasValidated').pushObject(type);
            return false;
        }

        if (url === undefined) {
            // Not initialised
            return;
        }

        if (url.href.startsWith(this.siteUrl)) {
            const path = url.href.replace(this.siteUrl, '');
            this.settings.set(type, path);
        } else {
            this.settings.set(type, url.href);
        }
    },

    copyLinkOrAttribute: task(function* () {
        copyTextToClipboard(this.showModalLinkOrAttribute);
        yield timeout(this.isTesting ? 50 : 3000);
    }),

    saveTask: task(function* () {
        this.send('validateFreeSignupRedirect');
        this.send('validatePaidSignupRedirect');
        if (this.get('settings.errors').length !== 0) {
            return;
        }
        yield this.settings.save();
        this.closeModal();
    }).drop()
});
