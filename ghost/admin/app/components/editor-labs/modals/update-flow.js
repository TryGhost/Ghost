import Component from '@glimmer/component';
import {task} from 'ember-concurrency';

export default class UpdateFlowModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @task
    *saveTask() {
        yield this.args.data.saveTask.perform();
        this.args.close();
        return true;
    }
}
