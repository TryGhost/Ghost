import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditorPostPreviewModal extends Component {
    @service settings;
    @service session;

    static modalOptions = {
        className: 'fullscreen-modal-total-overlay publish-modal',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked tab = this.args.data.currentTab || 'browser';
    @tracked isChangingTab = false;
    @tracked previewEmailAddress = this.session.user.email;

    constructor() {
        super(...arguments);
        this.saveFirstTask.perform();
    }

    get skipAnimation() {
        return this.args.data.skipAnimation || this.isChangingTab;
    }

    @action
    changeTab(tab) {
        this.tab = tab;
        this.isChangingTab = true;
        this.args.data.changeTab?.(tab);
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
    *copyPreviewUrl() {
        copyTextToClipboard(this.args.post.previewUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    }

    noop() {}
}
