import getScrollParent from 'ghost-admin/utils/get-scroll-parent';
import {modifier} from 'ember-modifier';

export default modifier((element, [shouldScroll = true], {offset = 0}) => {
    if (shouldScroll) {
        const scrollParent = getScrollParent(element);

        const isOffTop = element.offsetTop < scrollParent.scrollTop;
        const isOffBottom = scrollParent.scrollTop + scrollParent.offsetHeight < element.offsetTop + element.offsetHeight;

        if (isOffTop) {
            const top = element.offsetTop - offset;
            scrollParent.scrollTo({top, behavior: 'smooth'});
        }

        if (isOffBottom) {
            const top = element.offsetTop - scrollParent.offsetHeight + element.offsetHeight + offset;
            scrollParent.scrollTo({top, behavior: 'smooth'});
        }
    }
});
