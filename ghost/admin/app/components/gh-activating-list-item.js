import Component from '@ember/component';
import {schedule} from '@ember/runloop';

export default Component.extend({
    active: false,
    classNameBindings: ['active'],
    linkClasses: null,
    tagName: 'li',

    actions: {
        setActive(value) {
            schedule('afterRender', this, function () {
                this.set('active', value);
            });
        }
    },

    click() {
        this.$('a').blur();
    }
});
