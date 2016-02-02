import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    computed
} = Ember;

export default Ember.Component.extend(ValidationEngine, {
    validationType: 'client',

    actions: {
        deleteUrl(value){
            this.attrs.deleteUrl(value);
        }
    }
});
