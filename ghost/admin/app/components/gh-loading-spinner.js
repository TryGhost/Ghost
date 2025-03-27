import Component from '@glimmer/component';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhLoadingSpinnerComponent extends Component {
    @tracked showSpinner = false;

    // ms until the loader is displayed,
    // prevents unnecessary flash of spinner
    slowLoadTimeout = 200;

    constructor() {
        super(...arguments);
        this.startSpinnerTimeout.perform();
    }

    @task
    *startSpinnerTimeout() {
        yield timeout(this.slowLoadTimeout);
        this.showSpinner = true;
    }
}
