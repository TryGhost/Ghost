import ModalComponent from 'ghost-admin/components/modal-base';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalEmailDesignSettings extends ModalComponent {
    @service()
    settings;

    @service()
    session;

    @service()
    config;

    @tracked
    showHeader = this.settings.get('newsletterShowHeader');

    @tracked
    bodyFontCategory = this.settings.get('newsletterBodyFontCategory');

    @tracked
    showBadge = this.settings.get('newsletterShowBadge');

    @tracked
    footerContent = this.settings.get('newsletterFooterContent');

    @tracked
    currentDate = moment().format('D MMM YYYY');

    @action
    setShowHeader(event) {
        this.showHeader = event.target.checked;
    }

    @action
    setBodyFontCategory(value) {
        this.bodyFontCategory = value;
    }

    @action
    setShowBadge(event) {
        this.showBadge = event.target.checked;
    }

    @action
    setFooterContent(value) {
        this.footerContent = value;
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
        if (this.showHeader !== null) {
            this.settings.set('newsletterShowHeader', this.showHeader);
        }
        if (this.bodyFontCategory !== null) {
            this.settings.set('newsletterBodyFontCategory', this.bodyFontCategory);
        }
        if (this.showBadge !== null) {
            this.settings.set('newsletterShowBadge', this.showBadge);
        }
        if (this.footerContent !== null) {
            this.settings.set('newsletterFooterContent', this.footerContent);
        }
        yield this.settings.save();
        this.closeModal();
    }
}
