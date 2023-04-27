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
        return {apiUrl, previewData: getPreviewData(scriptTag)};
    }
    return {};
}

function getPreviewData(scriptTag) {
    if (scriptTag.dataset.preview) {
        const announcement = scriptTag.dataset.announcement;
        const announcementBackground = scriptTag.dataset.announcementBackground;

        return {announcement, announcement_background: announcementBackground};
    }

    return null;
}

function setup() {
    addRootDiv();
}

function init() {
    const {apiUrl, previewData} = getSiteData();
    setup();
    ReactDOM.render(
        <React.StrictMode>
            <App
                apiUrl={apiUrl}
                previewData={previewData}
            />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
