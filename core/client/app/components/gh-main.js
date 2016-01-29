import Ember from 'ember';

const {Component} = Ember;

export default Component.extend({
    tagName: 'main',
    classNames: ['gh-main'],
    ariaRole: 'main',

    mouseEnter() {
        this.sendAction('onMouseEnter');
    }
});
