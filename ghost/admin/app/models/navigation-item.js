import EmberObject, {computed} from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isBlank} from '@ember/utils';

export default EmberObject.extend(ValidationEngine, {
    label: '',
    url: '',
    isNew: false,
    isSecondary: false,

    validationType: 'navItem',

    isComplete: computed('label', 'url', function () {
        let {label, url} = this;

        return !isBlank(label) && !isBlank(url);
    }),

    isBlank: computed('label', 'url', function () {
        let {label, url} = this;

        return isBlank(label) && isBlank(url);
    })
});
