import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PostPreviewModal extends Component {
    @service settings;
    @service session;

    static modalOptions = {
        className: 'fullscreen-modal-full-overlay fullscreen-modal-email-preview',
        focusTrapOptions: null // not ideal but date inputs aren't focusable otherwise
    };

    @tracked tab = 'browser';

    constructor() {
        super(...arguments);
        this.saveFirstTask.perform();
    }

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @task
    *saveFirstTask() {
        const {saveTask, post, hasDirtyAttributes} = this.args.data;

        if (saveTask.isRunning) {
            return yield saveTask.last;
        }

        if (post.isDraft && hasDirtyAttributes) {
            yield saveTask.perform();
        }
    }
}
