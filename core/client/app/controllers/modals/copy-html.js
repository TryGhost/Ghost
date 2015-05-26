import Ember from 'ember';

export default Ember.Controller.extend({
    generatedHTML: Ember.computed.alias('model.generatedHTML')
});
