import Ember from 'ember';
var CopyHTMLController = Ember.Controller.extend({

    generatedHTML: Ember.computed.alias('model.generatedHTML')

});

export default CopyHTMLController;
