import Component from '@ember/component';
import layout from '../templates/components/kg-action-bar';
import {computed} from '@ember/object';

export default Component.extend({
    layout,

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
