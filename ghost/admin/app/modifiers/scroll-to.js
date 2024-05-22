import getScrollParent from 'ghost-admin/utils/get-scroll-parent';
import {modifier} from 'ember-modifier';

export default modifier((element, positional, {when = true}) => {
    if (when) {
        // setTimeout needed to ensure layout has finished and we have accurate positioning
        setTimeout(() => {
            const scrollParent = getScrollParent(element);
            const y = element.offsetTop;
            scrollParent.scrollTo({top: y, behavior: 'smooth'});
        }, 200);
    }
}, {eager: false});
