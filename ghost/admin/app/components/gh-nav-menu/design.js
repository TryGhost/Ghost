import Component from '@glimmer/component';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DesignMenuComponent extends Component {
    @service config;
    @service customThemeSettings;
    @service router;
    @service settings;
    @service store;
    @service themeManagement;

    @tracked openSection = null;

    themes = this.store.peekAll('theme');

    constructor() {
        super(...arguments);

        // fetch all themes in the background so we can show the active theme
        this.store.findAll('theme');

        if (this.router.currentRouteName === 'settings.design.index') {
            this.openDefaultSection();
        }

        this.routeDidChangeHandler = bind(this, this.handleRouteDidChange);
        this.router.on('routeDidChange', this.routeDidChangeHandler);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.router.off('routeDidChange', this.routeDidChangeHandler);
    }

    get activeTheme() {
        return this.themes.findBy('active', true);
    }

    @action
    toggleSection(section) {
        if (this.openSection === section) {
            this.openSection = null;
        } else {
            this.openSection = section;

            const group = this.customThemeSettings.KNOWN_GROUPS.findBy('key', section);
            if (group && group.previewType) {
                this.themeManagement.setPreviewType(group.previewType);
            } else {
                this.themeManagement.setPreviewType('homepage');
            }
        }
    }

    @action
    transitionBackToIndex() {
        if (this.router.currentRouteName !== 'settings.design.index') {
            this.router.transitionTo('settings.design.index');
        }
    }

    @action
    closeAllSections() {
        this.openSection = null;
    }

    openDefaultSection() {
        const noCustomSettings = isEmpty(this.customThemeSettings.settings);

        if (noCustomSettings) {
            this.openSection = 'brand';
        }
    }

    handleRouteDidChange(transition) {
        if (!transition.isAborted && transition.to?.name === 'settings.design.index') {
            this.openDefaultSection();
        }
    }
}
