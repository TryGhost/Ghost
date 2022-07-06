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
        const siteUrl = scriptTag.dataset.sodoSearch;
        const apiKey = scriptTag.dataset.key;
        const appVersion = scriptTag.dataset.version;
        return {siteUrl, apiKey, appVersion};
    }
    return {};
}

function setup({siteUrl}) {
    addRootDiv();
}

function init() {
    const {siteUrl: customSiteUrl, apiKey, apiUrl, appVersion} = getSiteData();
    const siteUrl = customSiteUrl || window.location.origin;
    setup({siteUrl});
    ReactDOM.render(
        <React.StrictMode>
            <App
                siteUrl={siteUrl} apiKey={apiKey} apiUrl={apiUrl}
                appVersion={appVersion}
            />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
