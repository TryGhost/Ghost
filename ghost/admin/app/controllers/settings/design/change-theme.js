import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class ChangeThemeController extends Controller {
    @service store;
    @service themeManagement;

    @tracked showAdvanced = false;

    marketplaceThemes = [{
        name: 'Edition',
        category: 'Newsletter',
        url: 'https://github.com/TryGhost/Edition',
        previewUrl: 'https://ghost.org/themes/edition',
        ref: 'TryGhost/Edition',
        image: 'assets/img/themes/Edition.jpg',
        shortImage: 'assets/img/themes/Edition-cut.jpg'
    }, {
        name: 'Alto',
        category: 'Blog',
        url: 'https://github.com/TryGhost/Alto',
        previewUrl: 'https://ghost.org/themes/alto',
        ref: 'TryGhost/Alto',
        image: 'assets/img/themes/Alto.jpg',
        shortImage: 'assets/img/themes/Alto-cut.jpg'
    }, {
        name: 'London',
        category: 'Photography',
        url: 'https://github.com/TryGhost/London',
        previewUrl: 'https://ghost.org/themes/london',
        ref: 'TryGhost/London',
        image: 'assets/img/themes/London.jpg',
        shortImage: 'assets/img/themes/London-cut.jpg'
    }, {
        name: 'Ease',
        category: 'Documentation',
        url: 'https://github.com/TryGhost/Ease',
        previewUrl: 'https://ghost.org/themes/ease',
        ref: 'TryGhost/Ease',
        image: 'assets/img/themes/Ease.jpg',
        shortImage: 'assets/img/themes/Ease-cut.jpg'
    }]

    get themes() {
        return this.store.peekAll('theme');
    }

    @action
    toggleAdvanced() {
        this.showAdvanced = !this.showAdvanced;
    }
}
