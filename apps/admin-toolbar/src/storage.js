import {DISPLAY_EXPANDED, DISPLAY_MINIMIZED, STORAGE_KEY} from './constants';

export function getStoredDisplayState() {
    try {
        return window.localStorage?.getItem(STORAGE_KEY) === DISPLAY_MINIMIZED ? DISPLAY_MINIMIZED : DISPLAY_EXPANDED;
    } catch {
        return DISPLAY_EXPANDED;
    }
}

export function setStoredDisplayState(value) {
    try {
        window.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
        // Ignore storage failures so private browsing restrictions do not break the toolbar.
    }
}
