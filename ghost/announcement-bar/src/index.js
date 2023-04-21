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
        const adminUrl = scriptTag.dataset.announcementBar;
        const apiKey = scriptTag.dataset.key;
        const apiUrl = scriptTag.dataset.api;
        return {adminUrl, apiKey, apiUrl};
    }
    return {};
}

function setup() {
    addRootDiv();
}

function init() {
    const {adminUrl, apiKey, apiUrl} = getSiteData();
    const adminBaseUrl = (adminUrl || window.location.origin)?.replace(/\/+$/, '');
    setup();
    ReactDOM.render(
        <React.StrictMode>
            <App
                adminUrl={adminBaseUrl}
                apiKey={apiKey}
                apiUrl={apiUrl}
            />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
