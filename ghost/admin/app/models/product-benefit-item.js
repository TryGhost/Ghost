import EmberObject from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';

export default EmberObject.extend(ValidationEngine, {
    label: '',
    isNew: false,

    validationType: 'productBenefitItem',

    isComplete: computed('label', function () {
        let {label} = this;

        return !isBlank(label);
    }),

    isBlank: computed('label', function () {
        let {label} = this;

        return isBlank(label);
    })
});
