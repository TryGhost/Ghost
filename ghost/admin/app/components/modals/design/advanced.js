import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class ModalsDesignAdvancedComponent extends Component {
    @service store;

    get themes() {
        return this.store.peekAll('theme');
    }

    constructor() {
        super(...arguments);
        this.loadThemesTask.perform();
    }

    @task
    *loadThemesTask() {
        yield this.store.findAll('theme');
    }
}
