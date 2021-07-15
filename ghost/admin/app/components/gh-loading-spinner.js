import Component from '@ember/component';
import {task, timeout} from 'ember-concurrency';

export default Component.extend({
    tagName: '',

    showSpinner: false,
    // ms until the loader is displayed,
    // prevents unnecessary flash of spinner
    slowLoadTimeout: 200,

    didInsertElement() {
        this._super(...arguments);
        this.startSpinnerTimeout.perform();
    },

    startSpinnerTimeout: task(function* () {
        yield timeout(this.slowLoadTimeout);
        this.set('showSpinner', true);
    })
});
