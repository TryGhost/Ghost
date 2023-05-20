import useMovable from './useMovable.js';
import {debounce} from 'lodash';
import {useCallback, useLayoutEffect} from 'react';

const CARD_SPACING = 20;
const MIN_RIGHT_SPACING = 20;
const MIN_TOP_SPACING = 66 + 20; // 66 is publish menu and word count size

export default function useSettingsPanelPosition({positionToRef} = {}) {
    const {ref} = useMovable({adjustOnResize: calculateResizeAdjustment});

    useLayoutEffect(() => {
        if (!ref) {
            return;
        }

        positionPanel(ref.current);

        const panelRepositionDebounced = debounce(() => {
            positionPanel(ref.current);
        }, 250);
        window.addEventListener('resize', panelRepositionDebounced);

        return () => {
            window.removeEventListener('resize', panelRepositionDebounced);
        };
    }, [positionPanel, ref]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    function positionPanel(panelElem) {
        if (!panelElem) {
            return;
        }

        const panelRect = panelElem.getBoundingClientRect();
        const cardElement = positionToRef || document.querySelector('[data-kg-card-editing="true"]');

        if (!cardElement) {
            return;
        }
        const containerRect = cardElement.getBoundingClientRect();

        // position vertically centered
        let top;
        const currentTop = panelElem.style.top;
        // if we already have top set, leave it so that toggling additional settings doesn't cause the panel to jump (unless it would be offscreen)
        const containerMiddle = containerRect.top + (containerRect.height / 2);
        top = currentTop ? currentTop : Math.max(containerMiddle - (panelRect.height), MIN_TOP_SPACING);
        // if part of panel would be off screen adjust to keep minimum distance from window top/botom
        if (top + panelRect.height > window.innerHeight - MIN_TOP_SPACING) {
            top = window.innerHeight - MIN_TOP_SPACING - panelRect.height;
        }

        // position to right of panel
        let left = containerRect.right + CARD_SPACING;
        // if part of panel would be off screen adjust to keep minimum distance from window edge
        if (left + panelRect.width > window.innerWidth - MIN_RIGHT_SPACING) {
            left = window.innerWidth - panelRect.width - MIN_RIGHT_SPACING;
        }

        panelElem.style.position = 'fixed';
        panelElem.style.top = `${top}px`;
        panelElem.style.left = `${left}px`;
    }

    function calculateResizeAdjustment(panelElem, {x, y}) {
        const panelRect = panelElem.getBoundingClientRect();

        const topIsOffscreen = panelRect.top < 0;
        const bottomIsOffscreen = panelRect.bottom > window.innerHeight;

        if (topIsOffscreen && bottomIsOffscreen) {
            // there's not much we can do here, the screen is too small.
            // leave as-is to avoid any weird jumping
            return {x, y};
        }

        if (topIsOffscreen) {
            const yAdjustment = Math.abs(panelRect.top) + 10;

            return {x, y: y + yAdjustment};
        }

        if (bottomIsOffscreen) {
            const yAdjustment = -Math.abs(panelRect.bottom - window.innerHeight) - 10;
            return {x, y: y + yAdjustment};
        }

        // no adjustment needed
        return {x, y};
    }

    const repositionPanel = useCallback(() => positionPanel(ref.current), []);

    return {
        ref,
        repositionPanel
    };
}
