import Ember from 'ember';
var ActivatingListItem = Ember.Component.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    active: false,

    unfocusLink: function () {
        this.$('a').blur();
    }.on('click')
});

export default ActivatingListItem;
