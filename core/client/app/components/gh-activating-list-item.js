import Ember from 'ember';

const {Component, run} = Ember;

export default Component.extend({
    tagName: 'li',
    classNameBindings: ['active'],
    active: false,
    linkClasses: null,

    click() {
        this.$('a').blur();
    },

    actions: {
        setActive(value) {
            run.schedule('afterRender', this, function () {
                this.set('active', value);
            });
        }
    }
});
