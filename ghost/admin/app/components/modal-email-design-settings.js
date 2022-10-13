import ModalComponent from 'ghost-admin/components/modal-base';
import moment from 'moment-timezone';
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

    @tracked headerImage = this.settings.newsletterHeaderImage;
    @tracked showHeaderIcon = this.settings.newsletterShowHeaderIcon;
    @tracked showHeaderTitle = this.settings.newsletterShowHeaderTitle;
    @tracked titleFontCategory = this.settings.newsletterTitleFontCategory;
    @tracked titleAlignment = this.settings.newsletterTitleAlignment;
    @tracked showFeatureImage = this.settings.newsletterShowFeatureImage;
    @tracked bodyFontCategory = this.settings.newsletterBodyFontCategory;
    @tracked footerContent = this.settings.newsletterFooterContent;
    @tracked showBadge = this.settings.newsletterShowBadge;

    currentDate = moment().format('D MMM YYYY');
    copyrightYear = new Date().getFullYear();
    imageExtensions = IMAGE_EXTENSIONS;

    get showHeader() {
        return (this.showHeaderIcon && this.settings.icon) || this.showHeaderTitle;
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
        this.settings.newsletterHeaderImage = this.headerImage;
        this.settings.newsletterShowHeaderIcon = this.showHeaderIcon;
        this.settings.newsletterShowHeaderTitle = this.showHeaderTitle;
        this.settings.newsletterTitleFontCategory = this.titleFontCategory;
        this.settings.newsletterTitleAlignment = this.titleAlignment;
        this.settings.newsletterShowFeatureImage = this.showFeatureImage;
        this.settings.newsletterBodyFontCategory = this.bodyFontCategory;
        this.settings.newsletterFooterContent = this.footerContent;
        this.settings.newsletterShowBadge = this.showBadge;

        yield this.settings.save();
        this.closeModal();
    }
}
