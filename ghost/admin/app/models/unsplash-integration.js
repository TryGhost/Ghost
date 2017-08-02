import EmberObject from 'ember-object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default EmberObject.extend(ValidationEngine, {
    // values entered here will act as defaults
    applicationId: '',

    validationType: 'unsplashIntegration',

    isActive: false
});
