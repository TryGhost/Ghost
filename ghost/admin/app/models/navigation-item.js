import computed from 'ember-computed';
import {isBlank} from 'ember-utils';
import EmberObject from 'ember-object';

import ValidationEngine from 'ghost-admin/mixins/validation-engine';

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
