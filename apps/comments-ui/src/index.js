import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

const ROOT_DIV_ID = 'ghost-comments-root';

function addRootDiv() {
    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    document.body.appendChild(elem);
}

function getSiteData() {
    /**
     * @type {HTMLElement}
     */
    const scriptTag = document.querySelector('script[data-ghost]');
    if (scriptTag) {
        const siteUrl = scriptTag.dataset.ghost;
        const apiKey = scriptTag.dataset.key;
        const apiUrl = scriptTag.dataset.api;
        return {siteUrl, apiKey, apiUrl};
    }
    return {};
}

function handleTokenUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

function setup({siteUrl}) {
    addRootDiv();
    handleTokenUrl();
}

function init() {
    // const customSiteUrl = getSiteUrl();
    const {siteUrl: customSiteUrl} = getSiteData();
    const siteUrl = customSiteUrl || window.location.origin;
    setup({siteUrl});
    ReactDOM.render(
        <React.StrictMode>
            Hello World
            {/* <App siteUrl={siteUrl} customSiteUrl={customSiteUrl} apiKey={apiKey} apiUrl={apiUrl} /> */}
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
