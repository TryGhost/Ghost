import Ember from 'ember';
var ActivatingListItem = Ember.Component.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    active: false,
    linkClasses: Ember.computed('linkClass', function () {
        return this.get('linkClass');
    }),

    unfocusLink: function () {
        this.$('a').blur();
    }.on('click')
});

export default ActivatingListItem;
