import Ember from 'ember';
var Form = Ember.View.extend({
    tagName: 'form',
    attributeBindings: ['enctype'],
    reset: function () {
        this.$().get(0).reset();
    },
    didInsertElement: function () {
        this.get('controller').on('reset', this, this.reset);
    },
    willClearRender: function () {
        this.get('controller').off('reset', this, this.reset);
    }
});

export default Form;
