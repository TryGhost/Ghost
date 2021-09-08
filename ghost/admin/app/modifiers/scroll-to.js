import getScrollParent from 'ghost-admin/utils/get-scroll-parent';
import {modifier} from 'ember-modifier';

export default modifier((element, positional, {shouldScroll = true}) => {
    if (shouldScroll) {
        // setTimeout needed to ensure layout has finished and we have accurate
        setTimeout(() => {
            const scrollParent = getScrollParent(element);
            const y = element.offsetTop;
            scrollParent.scrollTo({top: y, behavior: 'smooth'});
        }, 200);
    }
});
