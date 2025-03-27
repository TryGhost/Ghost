import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import {ROOT_DIV_ID} from './utils/constants';

function getScriptTag(): HTMLElement {
    let scriptTag = document.currentScript as HTMLElement | null;

    if (!scriptTag && import.meta.env.DEV) {
        // In development mode, use any script tag (because in ESM mode, document.currentScript is not set)
        scriptTag = document.querySelector('script[data-ghost-comments]');
    }

    if (!scriptTag) {
        throw new Error('[Comments-UI] Cannot find current script tag');
    }

    return scriptTag;
}

/**
 * Returns a div to mount the React application into, creating it if necessary
 */
function getRootDiv(scriptTag: HTMLElement) {
    if (scriptTag.previousElementSibling && scriptTag.previousElementSibling.id === ROOT_DIV_ID) {
        return scriptTag.previousElementSibling;
    }

    if (!scriptTag.parentElement) {
        throw new Error('[Comments-UI] Script tag does not have a parent element');
    }

    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    scriptTag.parentElement.insertBefore(elem, scriptTag);
    return elem;
}

function handleTokenUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

function init() {
    const scriptTag = getScriptTag();
    const root = getRootDiv(scriptTag);

    try {
        handleTokenUrl();

        ReactDOM.render(
            <React.StrictMode>
                {<App scriptTag={scriptTag} />}
            </React.StrictMode>,
            root
        );
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
    }
}

init();
