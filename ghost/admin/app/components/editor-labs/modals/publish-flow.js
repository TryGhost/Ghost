import Component from '@glimmer/component';
import {action} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PublishModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked isConfirming = false;
    @tracked isComplete = false;

    get recipientType() {
        const filter = this.args.data.publishOptions.recipientFilter;

        if (!filter) {
            return 'none';
        }

        if (filter === 'status:free') {
            return 'free';
        }

        if (filter === 'status:-free') {
            return 'paid';
        }

        if (filter.includes('status:free') && filter.includes('status:-free')) {
            return 'all';
        }

        return 'specific';
    }

    @action
    toggleConfirm() {
        // TODO: validate?
        this.isConfirming = !this.isConfirming;
    }

    @task
    *saveTask() {
        yield this.args.data.saveTask.perform();

        this.isConfirming = false;
        this.isComplete = true;
    }
}
