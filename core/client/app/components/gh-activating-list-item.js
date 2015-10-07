import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    active: false,
    linkClasses: null,

    unfocusLink: Ember.on('click', function () {
        this.$('a').blur();
    }),

    actions: {
        setActive: function (value) {
            Ember.run.schedule('afterRender', this, function () {
                this.set('active', value);
            });
        }
    }
});
