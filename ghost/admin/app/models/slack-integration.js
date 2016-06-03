import Ember from 'ember';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

const {
    computed,
    isBlank
} = Ember;

export default Ember.Object.extend(ValidationEngine, {
    // values entered here will act as defaults
    url: '',

    validationType: 'slackIntegration',

    isActive: computed('url', function () {
        let url = this.get('url');
        return !isBlank(url);
    })
});
