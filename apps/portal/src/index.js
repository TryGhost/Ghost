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
        const locale = scriptTag.dataset.locale; // not providing a fallback here but will do it within the app.
        let localeRoot = scriptTag.dataset.localeRoot ?? './locales';

        // CASE: The root is based on the current script, resolve it
        if (localeRoot.startsWith('.')) {
            const currentPath = import.meta.url.slice(0, import.meta.url.lastIndexOf('/'));
            localeRoot = new URL(localeRoot, currentPath).href;
        }

        // Remove the trailing slash since it's not needed by our i18n implementation
        localeRoot = localeRoot.replace(/\/$/, '');

        return {siteUrl, apiKey, apiUrl, siteI18nEnabled, locale, localeRoot};
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

function setup() {
    addRootDiv();
    handleTokenUrl();
}

function init() {
    // const customSiteUrl = getSiteUrl();
    const {siteUrl: customSiteUrl, apiKey, apiUrl, siteI18nEnabled, locale, localeRoot} = getSiteData();
    const siteUrl = customSiteUrl || window.location.origin;
    setup({siteUrl});
    ReactDOM.render(
        <React.StrictMode>
            <App siteUrl={siteUrl} customSiteUrl={customSiteUrl} apiKey={apiKey} apiUrl={apiUrl} siteI18nEnabled={siteI18nEnabled} locale={locale} localeRoot={localeRoot} />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
