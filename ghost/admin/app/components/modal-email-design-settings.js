import ModalComponent from 'ghost-admin/components/modal-base';
import moment from 'moment';
// TODO: expose this via a helper
import {IMAGE_EXTENSIONS} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class ModalEmailDesignSettings extends ModalComponent {
    @service config;
    @service ghostPaths;
    @service session;
    @service settings;

    @tracked headerImage = this.settings.get('newsletterHeaderImage');
    @tracked showHeaderIcon = this.settings.get('newsletterShowHeaderIcon');
    @tracked showHeaderTitle = this.settings.get('newsletterShowHeaderTitle');
    @tracked titleFontCategory = this.settings.get('newsletterTitleFontCategory');
    @tracked titleAlignment = this.settings.get('newsletterTitleAlignment');
    @tracked showFeatureImage = this.settings.get('newsletterShowFeatureImage');
    @tracked bodyFontCategory = this.settings.get('newsletterBodyFontCategory');
    @tracked footerContent = this.settings.get('newsletterFooterContent');
    @tracked showBadge = this.settings.get('newsletterShowBadge');

    currentDate = moment().format('D MMM YYYY');
    copyrightYear = new Date().getFullYear();
    imageExtensions = IMAGE_EXTENSIONS;

    get showHeader() {
        return (this.showHeaderIcon && this.settings.get('icon')) || this.showHeaderTitle;
    }

    get featureImageUrl() {
        // keep path separate so asset rewriting correctly picks it up
        let imagePath = '/img/user-cover.png';
        let fullPath = this.ghostPaths.assetRoot.replace(/\/$/, '') + imagePath;
        return fullPath;
    }

    get featureImageStyle() {
        return htmlSafe(`background-image: url(${this.featureImageUrl})`);
    }

    @action
    toggleSetting(setting, event) {
        this[setting] = event.target.checked;
    }

    @action
    changeSetting(setting, value) {
        this[setting] = value;
    }

    @action
    imageUploaded(setting, images) {
        if (images[0]) {
            this[setting] = images[0].url;
        }
    }

    @action
    handleInputFocus() {
        this._removeShortcuts();
    }

    @action
    handleInputBlur() {
        this._setupShortcuts();
    }

    @action
    confirm() {
        this.saveSettings.perform();
    }

    @task({drop: true})
    *saveSettings() {
        this.settings.set('newsletterHeaderImage', this.headerImage);
        this.settings.set('newsletterShowHeaderIcon', this.showHeaderIcon);
        this.settings.set('newsletterShowHeaderTitle', this.showHeaderTitle);
        this.settings.set('newsletterTitleFontCategory', this.titleFontCategory);
        this.settings.set('newsletterTitleAlignment', this.titleAlignment);
        this.settings.set('newsletterShowFeatureImage', this.showFeatureImage);
        this.settings.set('newsletterBodyFontCategory', this.bodyFontCategory);
        this.settings.set('newsletterFooterContent', this.footerContent);
        this.settings.set('newsletterShowBadge', this.showBadge);

        yield this.settings.save();
        this.closeModal();
    }
}
