import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class EditorPostPreviewModal extends Component {
    @service settings;
    @service session;

    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked tab = this.args.data.currentTab || 'browser';

    constructor() {
        super(...arguments);
        this.saveFirstTask.perform();
    }

    @action
    changeTab(tab) {
        this.tab = tab;
        this.args.data.changeTab?.(tab);
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
}
