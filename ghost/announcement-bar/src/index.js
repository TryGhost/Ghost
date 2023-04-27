import React from 'react';
import ReactDOM from 'react-dom';

import {App} from './App';

const ROOT_DIV_ID = 'announcement-bar-root';

function addRootDiv() {
    if (document.getElementById(ROOT_DIV_ID)) {
        return;
    }

    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    document.body.prepend(elem);
}

function getSiteData() {
    /**
     * @type {HTMLElement}
     */
    const scriptTag = document.querySelector('script[data-announcement-bar]');
    if (scriptTag) {
        const apiUrl = scriptTag.dataset.apiUrl;
        return {apiUrl};
    }
    return {};
}

function setup() {
    addRootDiv();
}

function init() {
    const {apiUrl} = getSiteData();
    setup();
    ReactDOM.render(
        <React.StrictMode>
            <App
                apiUrl={apiUrl}
            />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
