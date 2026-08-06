import Component from '@glimmer/component';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const EVERYONE_FILTER = 'status:free,status:-free';

export default class PublishFlowOptions extends Component {
    @service feature;
    @service labelsManager;

    // where-it-goes toggles; publishType only supports three states so an
    // all-off selection is held locally and blocks the CTA instead
    @tracked webChecked = this.args.publishOptions.publishType !== 'send';
    @tracked emailChecked = this.args.publishOptions.publishType !== 'publish';

    get publishOptions() {
        return this.args.publishOptions;
    }

    get nothingSelected() {
        return !this.webChecked && !(this.emailChecked && !this.publishOptions.emailUnavailable);
    }

    get emailActive() {
        return this.emailChecked && !this.publishOptions.emailUnavailable && !this.publishOptions.emailDisabled;
    }

    // ---- send mode: standard (derived default) vs specific groups ----------

    get sendMode() {
        return this.publishOptions.selectedRecipientFilter === undefined ? 'standard' : 'custom';
    }

    get standardFilter() {
        return this.publishOptions.defaultRecipientFilter;
    }

    get standardIsEveryone() {
        return this.standardFilter === EVERYONE_FILTER;
    }

    get standardCountFilter() {
        const newsletterFilter = this.publishOptions.newsletter?.recipientFilter;

        if (!this.standardFilter) {
            return newsletterFilter;
        }

        return `${newsletterFilter}+(${this.standardFilter})`;
    }

    get selectedSegments() {
        const filter = this.publishOptions.selectedRecipientFilter;

        if (filter === undefined || filter === null) {
            return [];
        }

        return filter.split(',').reject(isBlank);
    }

    @action
    toggleWeb(event) {
        // a post must go out on at least one medium
        if (!event.target.checked && !(this.emailChecked && !this.publishOptions.emailUnavailable && !this.publishOptions.emailDisabled)) {
            event.target.checked = true;
            return;
        }

        this.webChecked = event.target.checked;
        this._syncPublishType();
    }

    @action
    toggleEmail(event) {
        if (!event.target.checked && !this.webChecked) {
            event.target.checked = true;
            return;
        }

        this.emailChecked = event.target.checked;
        this._syncPublishType();
    }

    @action
    useStandardSend() {
        this.publishOptions.setRecipientFilter(undefined);
    }

    @action
    useCustomSend() {
        if (this.sendMode === 'standard') {
            // empty selection until groups are picked; CTA stays blocked below
            this.publishOptions.setRecipientFilter(this._previousSegments || null);
        }
    }

    @action
    selectSegments(selectedOptions) {
        const segments = selectedOptions.map(option => option.segment);
        const filter = segments.join(',') || null;
        this._previousSegments = filter;
        this.publishOptions.setRecipientFilter(filter);
    }

    get customSelectionEmpty() {
        return this.sendMode === 'custom' && this.selectedSegments.length === 0;
    }

    get ctaBlocked() {
        return this.emailActive && this.customSelectionEmpty;
    }

    _syncPublishType() {
        const {webChecked, emailChecked} = this;

        if (webChecked && emailChecked) {
            this.publishOptions.setPublishType('publish+send');
        } else if (webChecked) {
            this.publishOptions.setPublishType('publish');
        } else if (emailChecked) {
            this.publishOptions.setPublishType('send');
        }
        // both off: leave the stored type, the CTA is blocked anyway
    }
}
