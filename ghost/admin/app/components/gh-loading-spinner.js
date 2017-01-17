import Component from 'ember-component';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    tagName: '',

    showSpinner: false,
    // ms until the loader is displayed,
    // prevents unnecessary flash of spinner
    slowLoadTimeout: 200,

    startSpinnerTimeout: task(function* () {
        yield timeout(this.get('slowLoadTimeout'));
        this.set('showSpinner', true);
    }),

    didInsertElement() {
        this.get('startSpinnerTimeout').perform();
    }
});
