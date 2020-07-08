import $ from 'jquery';
import ModalComponent from 'ghost-admin/components/modal-base';
import boundOneWay from '../utils/bound-one-way';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {alias, reads} from '@ember/object/computed';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
const ICON_EXTENSIONS = ['ico', 'png', 'svg', 'jpg', 'jpeg'];

export default ModalComponent.extend({
    settings: service(),
    membersUtils: service(),
    config: service(),
    page: 'signup',
    iconExtensions: null,
    defaultButtonIcons: null,
    isShowModalLink: true,
    customIcon: null,
    confirm() {},

    signupButtonText: boundOneWay('settings.portalButtonSignupText'),
    buttonIcon: boundOneWay('settings.portalButtonIcon'),
    allowSelfSignup: alias('model.allowSelfSignup'),

    isStripeConfigured: reads('membersUtils.isStripeEnabled'),

    backgroundStyle: computed('settings.accentColor', function () {
        let color = this.get('settings.accentColor') || '#ffffff';
        return htmlSafe(`background-color: ${color}`);
    }),

    accentColor: computed('settings.accentColor', function () {
        let color = this.get('settings.accentColor');
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }),

    showModalLinkOrAttribute: computed('isShowModalLink', function () {
        if (this.isShowModalLink) {
            return `${this.config.get('blogUrl')}/#/portal`;
        }
        return `data-portal`;
    }),

    portalPreviewUrl: computed('selectedButtonStyle', 'buttonIcon', 'signupButtonText', 'page', 'isFreeChecked', 'isMonthlyChecked', 'isYearlyChecked', 'settings.{portalName,portalButton,accentColor}', function () {
        const baseUrl = this.config.get('blogUrl');
        const portalBase = '/#/portal';
        const settingsParam = new URLSearchParams();
        settingsParam.append('button', this.settings.get('portalButton'));
        settingsParam.append('name', this.settings.get('portalName'));
        settingsParam.append('isFree', this.isFreeChecked);
        settingsParam.append('isMonthly', this.isMonthlyChecked);
        settingsParam.append('isYearly', this.isYearlyChecked);
        settingsParam.append('page', this.page);
        if (this.buttonIcon) {
            settingsParam.append('buttonIcon', encodeURIComponent(this.buttonIcon));
        }
        settingsParam.append('signupButtonText', encodeURIComponent(this.signupButtonText));
        if (this.settings.get('accentColor')) {
            settingsParam.append('accentColor', encodeURIComponent(`${this.settings.get('accentColor')}`));
        }
        if (this.selectedButtonStyle) {
            settingsParam.append('buttonStyle', encodeURIComponent(this.selectedButtonStyle.name));
        }
        return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
    }),

    showIconSetting: computed('selectedButtonStyle', function () {
        const selectedButtonStyle = this.get('selectedButtonStyle.name') || '';
        return selectedButtonStyle.includes('icon');
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
        this.buttonStyleOptions = [
            {name: 'icon-and-text', label: 'Icon and text'},
            {name: 'icon-only', label: 'Icon only'},
            {name: 'text-only', label: 'Text only'}
        ];
        this.defaultButtonIcons = [
            'https://raw.githubusercontent.com/leungwensen/svg-icon/master/dist/trimmed-svg/metro/user.svg',
            'https://raw.githubusercontent.com/leungwensen/svg-icon/master/dist/svg/icomoon/user-tie.svg',
            'https://raw.githubusercontent.com/leungwensen/svg-icon/master/dist/trimmed-svg/evil/user.svg'
        ];
        this.iconExtensions = ICON_EXTENSIONS;
        const portalButtonIcon = this.settings.get('portalButtonIcon') || '';
        if (portalButtonIcon && !portalButtonIcon.includes('githubusercontent')) {
            return this.set('customIcon', this.settings.get('portalButtonIcon'));
        }
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

        confirm() {
            return this.saveTask.perform();
        },

        isPlanSelected(plan) {
            const allowedPlans = this.settings.get('portalPlans');
            return allowedPlans.includes(plan);
        },

        switchPreviewPage(page) {
            this.set('page', page);
        },

        validateAccentColor() {
            let newColor = this.get('accentColor');
            let oldColor = this.get('settings.accentColor');
            let errMessage = '';

            // reset errors and validation
            this.get('settings.errors').remove('accentColor');
            this.get('settings.hasValidated').removeObject('accentColor');

            if (newColor === '') {
                // Clear out the accent color
                this.set('settings.accentColor', '');
                return;
            }

            // accentColor will be null unless the user has input something
            if (!newColor) {
                newColor = oldColor;
            }

            if (newColor[0] !== '#') {
                newColor = `#${newColor}`;
            }

            if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
                this.set('settings.accentColor', '');
                run.schedule('afterRender', this, function () {
                    this.set('settings.accentColor', newColor);
                });
            } else {
                errMessage = 'The color should be in valid hex format';
                this.get('settings.errors').add('accentColor', errMessage);
                this.get('settings.hasValidated').pushObject('accentColor');
                return;
            }
        },
        setButtonStyle(buttonStyle) {
            this.set('selectedButtonStyle', buttonStyle);
        },
        setSignupButtonText(event) {
            this.set('signupButtonText', event.target.value);
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
                this.set('buttonIcon', results[0].url);
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

        selectDefaultIcon(icon) {
            this.set('buttonIcon', icon);
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

    copyLinkOrAttribute: task(function* () {
        copyTextToClipboard(this.showModalLinkOrAttribute);
        yield timeout(this.isTesting ? 50 : 3000);
    }),

    saveTask: task(function* () {
        this.settings.set('portalButtonStyle', this.selectedButtonStyle.name);
        this.settings.set('portalButtonSignupText', this.signupButtonText);
        this.settings.set('portalButtonIcon', this.buttonIcon);
        yield this.settings.save();
        this.closeModal();
    }).drop()
});
