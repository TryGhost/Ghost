import Mixin from 'ember-metal/mixin';
import observer from 'ember-metal/observer';
import run from 'ember-runloop';
import {A as emberA} from 'ember-array/utils';
import {isEmpty} from 'ember-utils';

export default Mixin.create({

    errors: null,
    property: '',
    hasValidated: emberA(),

    hasError: false,

    setHasError() {
        let property = this.get('property');
        let errors = this.get('errors');
        let hasValidated = this.get('hasValidated');

        // if we aren't looking at a specific property we always want an error class
        if (!property && errors && !errors.get('isEmpty')) {
            this.set('hasError', true);
            return;
        }

        // If we haven't yet validated this field, there is no validation class needed
        if (!hasValidated || !hasValidated.includes(property)) {
            this.set('hasError', false);
            return;
        }

        if (errors && !isEmpty(errors.errorsFor(property))) {
            this.set('hasError', true);
            return;
        }

        this.set('hasError', false);
    },

    hasErrorObserver: observer('errors.[]', 'property', 'hasValidated.[]', function () {
        run.once(this, 'setHasError');
        // this.setHasError();
    }).on('init')

});
