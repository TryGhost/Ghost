import Mixin from '@ember/object/mixin';
import {A as emberA} from '@ember/array';
import {isEmpty} from '@ember/utils';
// eslint-disable-next-line ghost/ember/no-observers
import {observer} from '@ember/object';
import {on} from '@ember/object/evented';
import {run} from '@ember/runloop';

export default Mixin.create({

    errors: null,
    property: '',
    hasValidated: emberA(),

    hasError: false,

    setHasError() {
        let property = this.property;
        let errors = this.errors;
        let hasValidated = this.hasValidated;

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

    // eslint-disable-next-line ghost/ember/no-observers
    hasErrorObserver: on('init', observer('errors.[]', 'property', 'hasValidated.[]', function () {
        run.once(this, 'setHasError');
    }))

});
