import {kebabCase} from 'lodash-es';

// we use data attributes rather than classes even though they can be slower
// because in many instances our draggable/droppable element's classes attribute
// could be dynamically generated which could remove our DnD classes when changed

export const CONTAINER_DATA_ATTR = 'koenigDndContainer';
export const CONTAINER_SELECTOR = `[data-${kebabCase(CONTAINER_DATA_ATTR)}]`;

export const DRAGGABLE_DATA_ATTR = 'koenigDndDraggable';
export const DRAGGABLE_SELECTOR = `[data-${kebabCase(DRAGGABLE_DATA_ATTR)}]`;

export const DROPPABLE_DATA_ATTR = 'koenigDndDroppable';
export const DROPPABLE_SELECTOR = `[data-${kebabCase(DROPPABLE_DATA_ATTR)}]`;

export const DRAG_DISABLED_DATA_ATTR = 'koenigDndDisabled';
export const DRAG_DISABLED_SELECTOR = `[data-${kebabCase(DRAG_DISABLED_DATA_ATTR)}]`;

export const DROP_INDICATOR_ID = 'koenig-drag-drop-indicator';
export const DROP_INDICATOR_ZINDEX = 10000;

export const GHOST_CONTAINER_ID = 'koenig-drag-drop-ghost-container';

export const GHOST_ZINDEX = DROP_INDICATOR_ZINDEX + 1;
