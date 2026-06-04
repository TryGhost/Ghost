import EmberObject, {computed} from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isBlank} from '@ember/utils';

export default EmberObject.extend(ValidationEngine, {
    label: '',
    url: '',
    icon: '',
    visibility: 'public',
    isNew: false,
    isSecondary: false,

    validationType: 'navItem',

    isComplete: computed('label', 'url', 'icon', function () {
        let {label, url, icon} = this;

        return (!isBlank(label) || !isBlank(icon)) && !isBlank(url);
    }),

    isBlank: computed('label', 'url', 'icon', function () {
        let {label, url, icon} = this;

        return isBlank(label) && isBlank(url) && isBlank(icon);
    })
});
