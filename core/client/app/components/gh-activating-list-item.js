import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    active: false,
    linkClasses: null,

    unfocusLink: function () {
        this.$('a').blur();
    }.on('click')
});
