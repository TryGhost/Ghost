import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EmailSizeWarningComponent extends Component {
    @service emailSizeWarning;
    @service feature;
    @service settings;

    @tracked overLimit = false;
    @tracked emailSizeKb = null;

    get isEnabled() {
        return this.feature.emailSizeWarnings
            && this.settings.editorDefaultEmailRecipients !== 'disabled'
            && this.args.post
            && !this.args.post.email
            && !this.args.post.isNew;
    }

    constructor() {
        super(...arguments);
        if (this.isEnabled) {
            this.checkEmailSizeTask.perform();
        }
    }

    @action
    checkEmailSize() {
        if (this.isEnabled) {
            this.checkEmailSizeTask.perform();
        }
    }

    @task({restartable: true})
    *checkEmailSizeTask() {
        const result = yield this.emailSizeWarning.fetchEmailSize(this.args.post);
        this.overLimit = result.overLimit;
        this.emailSizeKb = result.emailSizeKb;
    }
}
