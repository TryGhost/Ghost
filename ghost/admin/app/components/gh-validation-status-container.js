import Component from '@ember/component';
import ValidationStateMixin from 'ghost-admin/mixins/validation-state';
import classic from 'ember-classic-decorator';
import {classNameBindings} from '@ember-decorators/component';
import {computed} from '@ember/object';

/**
 * Handles the CSS necessary to show a specific property state. When passed a
 * DS.Errors object and a property name, if the DS.Errors object has errors for
 * the specified property, it will change the CSS to reflect the error state
 * @param  {DS.Errors} errors   The DS.Errors object
 * @param  {string} property    Name of the property
 */
@classic
@classNameBindings('errorClass')
export default class GhValidationStatusContainer extends Component.extend(ValidationStateMixin) {
    @computed('property', 'hasError', 'hasValidated.[]')
    get errorClass() {
        let hasValidated = this.hasValidated;
        let property = this.property;

        if (hasValidated && hasValidated.includes(property)) {
            return this.hasError ? 'error' : 'success';
        } else {
            return '';
        }
    }
}
