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

    get isSegmentSelected() {
        const isCustomSegment = this.settings.get('editorDefaultEmailRecipients') === 'filter' &&
            !this.isNobodySelected;
        return !this.isDisabled && (this.segmentSelected || isCustomSegment);
    }

    @action
    setDefaultEmailRecipients(value) {
        this.segmentSelected = false;

        if (['disabled', 'visibility'].includes(value)) {
            this.settings.set('editorDefaultEmailRecipients', value);
            return;
        }

        if (value === 'none') {
            this.settings.set('editorDefaultEmailRecipientsFilter', null);
        }

        if (value === 'segment') {
            this.segmentSelected = true;
        }

        this.settings.set('editorDefaultEmailRecipients', 'filter');
    }

    @action
    setDefaultEmailRecipientsFilter(filter) {
        this.settings.set('editorDefaultEmailRecipientsFilter', filter);
    }
}
