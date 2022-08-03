import Component from '@glimmer/component';
import ConfirmDeleteThemeModal from './modals/design/confirm-delete-theme';
import {action, get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhThemeTableComponent extends Component {
    @service ghostPaths;
    @service modals;
    @service themeManagement;
    @service utils;

    activateTaskInstance = null;
    confirmDeleteModal = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.confirmDeleteModal?.close?.();
        this.activateTaskInstance?.cancel();
    }

    get sortedThemes() {
        let themes = this.args.themes.map((t) => {
            let theme = {};
            let themePackage = get(t, 'package');

            theme.model = t;
            theme.name = get(t, 'name');
            theme.label = themePackage ? `${themePackage.name}` : theme.name;
            theme.version = themePackage ? `${themePackage.version}` : '1.0';
            theme.package = themePackage;
            theme.active = get(t, 'active');
            theme.isDeletable = !theme.active;

            return theme;
        });
        let duplicateThemes = [];

        themes.forEach((theme) => {
            let duplicateLabels = themes.filterBy('label', theme.label);

            if (duplicateLabels.length > 1) {
                duplicateThemes.pushObject(theme);
            }
        });

        duplicateThemes.forEach((theme) => {
            if (theme.name !== 'casper') {
                theme.label = `${theme.label} (${theme.name})`;
            }
        });

        // "(default)" needs to be added to casper manually as it's always
        // displayed and would mess up the duplicate checking if added earlier
        let casper = themes.findBy('name', 'casper');
        if (casper) {
            casper.label = `${casper.label} (default)`;
            casper.isDefault = true;
            casper.isDeletable = false;
        }

        // sorting manually because .sortBy('label') has a different sorting
        // algorithm to [...strings].sort()
        return themes.sort((themeA, themeB) => {
            let a = themeA.label.toLowerCase();
            let b = themeB.label.toLowerCase();

            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
    }

    @action
    downloadTheme(themeName, dropdown) {
        dropdown?.actions.close();
        this.utils.downloadFile(`${this.ghostPaths.apiRoot}/themes/${themeName}/download/`);
    }

    @action
    activateTheme(theme, dropdown) {
        dropdown?.actions.close();
        this.activateTaskInstance = this.themeManagement.activateTask.perform(theme);
    }

    @action
    deleteTheme(theme, dropdown) {
        dropdown?.actions.close();

        this.confirmDeleteModal = this.modals.open(ConfirmDeleteThemeModal, {
            theme
        }).finally(() => {
            this.confirmDeleteModal = null;
        });
    }
}
