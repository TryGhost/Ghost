import Component from 'ember-component';
import {schedule} from 'ember-runloop';

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
            schedule('afterRender', this, function () {
                this.set('active', value);
            });
        }
    }
});
