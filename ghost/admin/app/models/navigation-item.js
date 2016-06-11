import Ember from 'ember';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

const {
    computed,
    isBlank,
    Object: EmberObject
} = Ember;

export default EmberObject.extend(ValidationEngine, {
    label: '',
    url: '',
    isNew: false,

    validationType: 'navItem',

    isComplete: computed('label', 'url', function () {
        let {label, url} = this.getProperties('label', 'url');

        return !isBlank(label) && !isBlank(url);
    }),

    isBlank: computed('label', 'url', function () {
        let {label, url} = this.getProperties('label', 'url');

        return isBlank(label) && isBlank(url);
    })
});
