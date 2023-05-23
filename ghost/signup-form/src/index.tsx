import App from './App.tsx';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {ROOT_DIV_ID} from './utils/constants';

function getScriptTag() {
    let scriptTag = document.currentScript;

    if (!scriptTag && import.meta.env.DEV) {
        // In development mode, use any script tag (because in ESM mode, document.currentScript is not set)
        // We use the first script in the body element
        scriptTag = document.querySelector('body script');
    }

    if (!scriptTag) {
        throw new Error('[Signup Form] Cannot find current script tag');
    }

    return scriptTag;
}

function getRootDiv() {
    const existingRootDiv = document.getElementById(ROOT_DIV_ID);
    if (existingRootDiv) {
        return existingRootDiv;
    }

    const scriptTag = getScriptTag();

    if (!scriptTag.parentElement) {
        throw new Error('[Signup Form] Script tag does not have a parent element');
    }

    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    scriptTag.parentElement.insertBefore(elem, scriptTag);
    return elem;
}

function init() {
    const root = getRootDiv();

    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

init();
