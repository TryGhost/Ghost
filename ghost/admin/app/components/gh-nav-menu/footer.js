import Component from '@ember/component';
import ThemeErrorsModal from '../modals/design/theme-errors';
import WhatsNew from '../modals/whats-new';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {and, match} from '@ember/object/computed';
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

    @inject config;

    @and('config.clientExtensions.dropdown', 'session.user.isOwnerOnly')
        showDropdownExtension;

    @match('router.currentRouteName', /^settings/)
        isSettingsRoute;

    @action
    openThemeErrors() {
        this.advancedModal = this.modals.open(ThemeErrorsModal, {
            title: 'Theme errors',
            canActivate: false,
            // Warnings will only be set for developers, otherwise it will always be empty
            warnings: this.themeManagement.activeTheme.warnings,
            errors: this.themeManagement.activeTheme.gscanErrors
        });
    }

    get hasThemeErrors() {
        const errors = this.themeManagement.activeTheme && this.themeManagement.activeTheme.gscanErrors;
        if (!errors) {
            return false;
        }
        // filter errors that have other UI to display to users that the functionality is not working
        const filteredErrors = errors?.filter((error) => {
            if (error.code === 'GS110-NO-MISSING-PAGE-BUILDER-USAGE' && error?.failures?.[0].message.includes(`show_title_and_feature_image`)) {
                return false;
            }
            return true;
        });
        return filteredErrors && filteredErrors.length;
    }

    // equivalent to "left: auto; right: -20px"
    userDropdownPosition(trigger, dropdown) {
        let {horizontalPosition, verticalPosition, style} = calculatePosition(...arguments);
        let {width: dropdownWidth} = dropdown.firstElementChild.getBoundingClientRect();

        style.right += (dropdownWidth - 20);
        style['z-index'] = '1100';

        return {horizontalPosition, verticalPosition, style};
    }

    @action
    openWhatsNew() {
        return this.modals.open(WhatsNew);
    }
}
