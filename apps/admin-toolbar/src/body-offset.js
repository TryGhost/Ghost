import {BODY_PADDING_VAR} from './constants';

let previousBodyPaddingBottom = null;

export function applyBodyOffset(height) {
    if (previousBodyPaddingBottom === null) {
        previousBodyPaddingBottom = document.body.style.paddingBottom || '';
    }

    const offset = `${height + 24}px`;
    document.documentElement.style.setProperty(BODY_PADDING_VAR, offset);
    document.body.style.paddingBottom = `calc(var(${BODY_PADDING_VAR}) + env(safe-area-inset-bottom, 0px))`;
}

export function clearBodyOffset() {
    document.documentElement.style.removeProperty(BODY_PADDING_VAR);
    document.body.style.paddingBottom = previousBodyPaddingBottom || '';
    previousBodyPaddingBottom = null;
}
