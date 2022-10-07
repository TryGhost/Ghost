import getScrollParent from 'ghost-admin/utils/get-scroll-parent';
import {modifier} from 'ember-modifier';

export default modifier((element, [shouldScroll = true], {offset = 0, useViewport = true}) => {
    if (shouldScroll) {
        const scrollParent = getScrollParent(element);

        // scrolls so the element is visible on-screen
        if (useViewport) {
            const elementRect = element.getBoundingClientRect();
            const scrollParentRect = scrollParent.getBoundingClientRect();

            // TODO: ensure scroll parent is visible?

            const isOffTop = elementRect.top < 0;
            const isOffBottom = elementRect.bottom > scrollParentRect.bottom;

            if (isOffTop) {
                // TODO: implement me
            }

            if (isOffBottom) {
                let adjustment = Math.abs(scrollParentRect.bottom - elementRect.bottom);

                // keep top on screen
                if (elementRect.top - adjustment < offset) {
                    const readjustment = Math.abs(elementRect.top - adjustment - (offset * 2));
                    adjustment -= readjustment;
                }

                const top = scrollParent.scrollTop + adjustment + offset;

                scrollParent.scrollTo({top, behavior: 'smooth'});
            }
        }

        // scrolls so the element is visible inside of the scroll parent's viewport,
        // may not result in element being visible on-screen if scroll parent is cut off
        if (!useViewport) {
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
    }
}, {eager: false});
