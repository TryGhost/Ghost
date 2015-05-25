import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'main',
    classNames: ['gh-main'],
    ariaRole: 'main',

    mouseEnter: function () {
        this.sendAction('onMouseEnter');
    }
});
