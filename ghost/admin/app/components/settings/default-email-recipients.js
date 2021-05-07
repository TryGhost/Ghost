import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class SettingsDefaultEmailRecipientsComponent extends Component {
    @service settings;

    @tracked segmentSelected = false;

    get isDisabled() {
        return this.settings.get('membersSignupAccess') === 'none';
    }

    get isDisabledSelected() {
        return this.isDisabled ||
            this.settings.get('editorDefaultEmailRecipients') === 'disabled';
    }

    get isVisibilitySelected() {
        return !this.isDisabled &&
            this.settings.get('editorDefaultEmailRecipients') === 'visibility';
    }

    get isNobodySelected() {
        return !this.isDisabled &&
            !this.segmentSelected &&
            this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            this.settings.get('editorDefaultEmailRecipientsFilter') === null;
    }

    get isAllSelected() {
        return !this.isDisabled &&
            !this.segmentSelected &&
            this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            this.settings.get('editorDefaultEmailRecipientsFilter') === 'status:free,status:-free';
    }

    get isFreeSelected() {
        return !this.isDisabled &&
            !this.segmentSelected &&
            this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            this.settings.get('editorDefaultEmailRecipientsFilter') === 'status:free';
    }

    get isPaidSelected() {
        return !this.isDisabled &&
            !this.segmentSelected &&
            this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            this.settings.get('editorDefaultEmailRecipientsFilter') === 'status:-free';
    }

    get isSegmentSelected() {
        const isCustomSegment = this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            !this.isNobodySelected &&
            !this.isAllSelected &&
            !this.isFreeSelected &&
            !this.isPaidSelected;

        return !this.isDisabled && (this.segmentSelected || isCustomSegment);
    }

    @action
    setDefaultEmailRecipients(value) {
        if (['disabled', 'visibility'].includes(value)) {
            this.settings.set('editorDefaultEmailRecipients', value);
            return;
        }

        if (value === 'none') {
            this.settings.set('editorDefaultEmailRecipientsFilter', null);
        }

        if (value === 'all') {
            this.settings.set('editorDefaultEmailRecipientsFilter', 'status:free,status:-free');
        }

        if (value === 'free') {
            this.settings.set('editorDefaultEmailRecipientsFilter', 'status:free');
        }

        if (value === 'paid') {
            this.settings.set('editorDefaultEmailRecipientsFilter', 'status:-free');
        }

        this.settings.set('editorDefaultEmailRecipients', 'filter');
    }
}
