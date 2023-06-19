import App from './App.tsx';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {ROOT_DIV_CLASS} from './utils/constants';

function getScriptTag(): HTMLElement {
    let scriptTag = document.currentScript as HTMLElement | null;

    if (!scriptTag && import.meta.env.DEV) {
        // In development mode, use any script tag (because in ESM mode, document.currentScript is not set)
        // We use the first script in the body element
        scriptTag = document.querySelector('body script:not([data-used="true"])') as HTMLElement;
        if (scriptTag) {
            scriptTag.dataset.used = 'true';
        }
    }

    if (!scriptTag) {
        throw new Error('[Signup Form] Cannot find current script tag');
    }

    return scriptTag;
}

/**
 * Note that we need to support multiple signup forms on the same page, so we need to find the root div for each script tag
 */
function getRootDiv(scriptTag: HTMLElement) {
    if (scriptTag.previousElementSibling && scriptTag.previousElementSibling.className === ROOT_DIV_CLASS) {
        return scriptTag.previousElementSibling;
    }

    if (!scriptTag.parentElement) {
        throw new Error('[Signup Form] Script tag does not have a parent element');
    }

    const elem = document.createElement('div');
    elem.className = ROOT_DIV_CLASS;
    scriptTag.parentElement.insertBefore(elem, scriptTag);
    return elem;
}

function init() {
    const scriptTag = getScriptTag();
    const root = getRootDiv(scriptTag);

    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <App scriptTag={scriptTag} />
        </React.StrictMode>
    );
}

init();
