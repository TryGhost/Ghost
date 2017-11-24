import Component from '@ember/component';

export default Component.extend({
    tagName: 'main',
    classNames: ['gh-main'],
    ariaRole: 'main',

    mouseEnter() {
        let action = this.get('onMouseEnter');
        if (action) {
            action();
        }
    }
});
