import ModalComponent from 'ghost-admin/components/modal-base';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalEmailDesignSettings extends ModalComponent {
    @service()
    settings;

    @service()
    config;

    @tracked
    showHeader = this.settings.get('newsletterShowHeader');

    @tracked
    bodyFontCategory = this.settings.get('newsletterBodyFontCategory');

    @tracked
    showBadge = this.settings.get('newsletterShowBadge');

    @tracked
    footerHtml = this.settings.get('newsletterFooterHtml');

    @action
    setShowHeader(event) {
        this.showHeader = event.target.checked;
    }

    @action
    setBodyFontCategory(value) {
        this.bodyFontCategory = value;
    }

    @action
    stopPropagation(event) {
        event.stopPropagation();
    }

    @action
    setShowBadge(event) {
        this.showBadge = event.target.checked;
    }

    @action
    setFooterHtml(event) {
        this.footerHtml = event.target.value;
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
        if (this.footerHtml !== null) {
            this.settings.set('newsletterFooterHtml', this.footerHtml);
        }
        yield this.settings.save();
        this.closeModal();
    }
}
