import Component from '@ember/component';
import {computed} from '@ember/object';

export default Component.extend({
    tagName: '',

    instantClose: false,
    isVisible: false,
    style: null,

    animationClasses: computed('isVisible', 'instantClose', function () {
        let {instantClose, isVisible} = this;
        let classes = [];

        if (!instantClose || (instantClose && isVisible)) {
            classes.push('anim-fast-bezier');
        }

        if (!isVisible) {
            classes.push('o-0 pop-down');
        }

        return classes.join(' ');
    })
});
