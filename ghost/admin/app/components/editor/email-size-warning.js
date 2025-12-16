import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EmailSizeWarningComponent extends Component {
    @service emailSizeWarning;
    @service feature;
    @service settings;

    @tracked warningLevel = null;
    @tracked emailSizeKb = null;

    get isEnabled() {
        return this.feature.emailSizeWarnings
            && this.settings.editorDefaultEmailRecipients !== 'disabled'
            && this.post
            && !this.post.email
            && !this.post.isNew;
    }

    get post() {
        return this.args.post;
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
        const result = yield this.emailSizeWarning.fetchEmailSize(this.post);
        this.warningLevel = result.warningLevel;
        this.emailSizeKb = result.emailSizeKb;
    }
}
