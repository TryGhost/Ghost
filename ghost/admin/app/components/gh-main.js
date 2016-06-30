import Component from 'ember-component';

export default Component.extend({
    tagName: 'main',
    classNames: ['gh-main'],
    ariaRole: 'main',

    mouseEnter() {
        this.sendAction('onMouseEnter');
    }
});
