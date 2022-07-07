import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const ROOT_DIV_ID = 'sodo-search-root';

function addRootDiv() {
    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    document.body.appendChild(elem);
}

function getSiteData() {
    /**
     * @type {HTMLElement}
     */
    const scriptTag = document.querySelector('script[data-sodo-search]');
    if (scriptTag) {
        const adminUrl = scriptTag.dataset.sodoSearch;
        const apiKey = scriptTag.dataset.key;
        const appVersion = scriptTag.dataset.version;
        return {adminUrl, apiKey, appVersion};
    }
    return {};
}

function setup() {
    addRootDiv();
}

function init() {
    const {adminUrl, apiKey, appVersion} = getSiteData();
    const adminBaseUrl = (adminUrl || window.location.origin)?.replace(/\/+$/, '');
    setup();
    ReactDOM.render(
        <React.StrictMode>
            <App
                adminUrl={adminBaseUrl} apiKey={apiKey}
                appVersion={appVersion}
            />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
