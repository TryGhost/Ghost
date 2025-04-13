import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditorPostPreviewModal extends Component {
    @service dropdown;
    @service settings;
    @service session;

    static modalOptions = {
        className: 'fullscreen-modal-total-overlay publish-modal',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked previewFormat = this.args.data.initialPreviewFormat || 'browser';
    @tracked previewSize = this.args.data.initialPreviewSize || 'desktop';
    @tracked isChangingTab = false;
    @tracked previewEmailAddress = this.session.user.email;
    @tracked previewAsSegment = 'free';
    @tracked previewAsOptions = [];

    constructor() {
        super(...arguments);
        this.saveFirstTask.perform();

        const {initialPreviewAsSegment} = this.args.data;
        if (initialPreviewAsSegment) {
            this.changePreviewAsSegment(initialPreviewAsSegment);
        }

        this.setPreviewAsOptions();
    }

    get selectedPreviewAsOption() {
        return this.previewAsOptions.find(option => option.value === this.previewAsSegment);
    }

    get skipAnimation() {
        return this.args.data.skipAnimation || this.isChangingTab;
    }

    get browserPreviewUrl() {
        const url = new URL(this.args.data.publishOptions.post.previewUrl);
        url.searchParams.set('member_status', this.previewAsSegment);
        return url.toString();
    }

    // manually set the tracked property rather than using a getter so we have
    // a stable reference when finding the selected option by value
    setPreviewAsOptions() {
        if (this.previewFormat === 'email') {
            this.previewAsOptions = [
                {label: 'Free member', value: 'free'}
            ];
        } else {
            this.previewAsOptions = [
                {label: 'Public visitor', value: 'anonymous'},
                {label: 'Free member', value: 'free'}
            ];
        }

        // add paid options if Stripe is enabled
        if (this.settings.paidMembersEnabled) {
            this.previewAsOptions.push(
                {label: 'Paid member', value: 'paid'}
            );
        }
    }

    @action
    changePreviewFormat(format) {
        this.isChangingTab = true;
        this.previewFormat = format;
        this.args.data.changePreviewFormat?.(format);
        this.setPreviewAsOptions();

        if (format === 'email' && this.previewAsSegment === 'anonymous') {
            this.changePreviewAsSegment('free');
        }
    }

    @action
    changePreviewSize(size) {
        this.isChangingTab = true;
        this.previewSize = size;
        this.args.data.changePreviewSize?.(size);
    }

    @action
    changePreviewAsSegment(segment) {
        if (this.previewFormat === 'email' && segment === 'anonymous') {
            segment = 'free';
        }
        this.previewAsSegment = segment;
        this.args.data.changePreviewAsSegment?.(segment);
    }

    @action
    changePreviewAsOption(option) {
        this.changePreviewAsSegment(option.value);
    }

    @action
    focusInput() {
        setTimeout(() => {
            document.querySelector('[data-post-preview-email-input]')?.focus();
        }, 100);
    }

    @task
    *saveFirstTask() {
        const {saveTask, publishOptions, hasDirtyAttributes} = this.args.data;

        if (saveTask.isRunning) {
            return yield saveTask.last;
        }

        if (publishOptions.post.isDraft && hasDirtyAttributes) {
            yield saveTask.perform();
        }
    }

    @task
    *copyPreviewUrlTask() {
        copyTextToClipboard(this.args.data.publishOptions.post.previewUrl);
        return yield true;
    }
}
