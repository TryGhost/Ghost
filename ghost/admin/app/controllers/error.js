import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';

export default Controller.extend({

    stack: false,
    error: readOnly('model'),

    code: computed('error.status', function () {
        return this.get('error.status') > 200 ? this.get('error.status') : 500;
    }),

    message: computed('error.statusText', function () {
        if (this.get('code') === 404) {
            return 'Page not found';
        }

        return this.get('error.statusText') !== 'error' ? this.get('error.statusText') : 'Internal Server Error';
    })
});
