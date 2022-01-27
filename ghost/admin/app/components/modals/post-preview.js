import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalPostPreviewComponent extends Component {
    @tracked tab = 'browser';
    @service settings;

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
