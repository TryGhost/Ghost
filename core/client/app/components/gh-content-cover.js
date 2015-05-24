import Ember from 'ember';

export default Ember.Component.extend({
    classNames: ['content-cover'],

    onClick: null,
    onMouseEnter: null,

    click: function () {
        this.sendAction('onClick');
    },

    mouseEnter: function () {
        this.sendAction('onMouseEnter');
    }
});
