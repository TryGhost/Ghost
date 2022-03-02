import Controller from '@ember/controller';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const THEME_PROPERTIES = {
    casper: ['description', 'color', 'coverImage'],
    edition: ['description', 'color', 'coverImage'],
    dawn: ['description', 'color', 'icon'],
    dope: ['description', 'color', 'logo'],
    bulletin: ['description', 'color', 'logo'],
    alto: ['description', 'color', 'logo'],
    journal: ['description', 'color', 'logo'],
    wave: ['description', 'color', 'logo', 'coverImage'],
    edge: ['description', 'color', 'logo'],
    ease: ['description', 'color', 'logo', 'coverImage'],
    ruby: ['description', 'color', 'logo', 'coverImage'],
    london: ['description', 'color', 'logo'],
    digest: ['description', 'color', 'logo']
};

export default class SetupFinishingTouchesController extends Controller {
    @service modals;
    @service router;
    @service settings;
    @service store;
    @service themeManagement;

    @tracked descriptionVisible;
    @tracked colorVisible;
    @tracked logoVisible;
    @tracked iconVisible;
    @tracked coverImageVisible;

    themes = null;

    // Default properties to display
    themeProperties = ['description', 'color', 'coverImage'];

    constructor() {
        super(...arguments);
        this.initThemeProperties.perform();
    }

    @task({drop: true})
    *initThemeProperties() {
        this.themes = yield this.store.peekAll('theme');
        if (isEmpty(this.themes)) {
            this.themes = yield this.store.findAll('theme');
        }

        const activeTheme = this.themes.findBy('active', true);

        if (activeTheme && THEME_PROPERTIES[activeTheme.name]) {
            this.themeProperties = THEME_PROPERTIES[activeTheme.name];
        }

        this.descriptionVisible = this.themeProperties.includes('description');
        this.logoVisible = this.themeProperties.includes('logo');
        this.iconVisible = this.themeProperties.includes('icon');
        this.colorVisible = this.themeProperties.includes('color');
        this.coverImageVisible = this.themeProperties.includes('coverImage');
    }

    @task
    *saveAndContinueTask() {
        yield this.settings.save();
        this.router.transitionTo('home');
    }
}
