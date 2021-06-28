import EmberObject from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';

export default EmberObject.extend(ValidationEngine, {
    name: '',
    isNew: false,

    validationType: 'productBenefitItem',

    isComplete: computed('name', function () {
        let {name} = this;

        return !isBlank(name);
    }),

    isBlank: computed('name', function () {
        let {name} = this;

        return isBlank(name);
    })
});
