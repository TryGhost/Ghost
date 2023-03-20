import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const ROOT_DIV_ID = 'ghost-portal-root';

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
        const siteI18nEnabled = scriptTag.dataset.i18n === 'true';
        const siteUrl = scriptTag.dataset.ghost;
        const apiKey = scriptTag.dataset.key;
        const apiUrl = scriptTag.dataset.api;
        return {siteUrl, apiKey, apiUrl, siteI18nEnabled};
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
    const {siteUrl: customSiteUrl, apiKey, apiUrl, siteI18nEnabled} = getSiteData();
    const siteUrl = customSiteUrl || window.location.origin;
    setup({siteUrl});
    ReactDOM.render(
        <React.StrictMode>
            <App siteUrl={siteUrl} customSiteUrl={customSiteUrl} apiKey={apiKey} apiUrl={apiUrl} siteI18nEnabled={siteI18nEnabled} />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
