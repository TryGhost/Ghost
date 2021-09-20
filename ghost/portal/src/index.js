import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import setupAnalytics from './analytics';

const ROOT_DIV_ID = 'ghost-portal-root';

function addRootDiv() {
    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    document.body.appendChild(elem);
}

function getSiteUrl() {
    /**
     * @type {HTMLElement}
     */
    const scriptTag = document.querySelector('script[data-ghost]');
    if (scriptTag) {
        return scriptTag.dataset.ghost;
    }
    return '';
}

function handleTokenUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

function setupAnalyticsScript({siteUrl}) {
    const analyticsTag = document.querySelector('meta[name=ghost-analytics-id]');
    const analyticsId = analyticsTag?.content;
    if (siteUrl && analyticsTag) {
        setupAnalytics({siteUrl, analyticsId});
    }
}

function setup({siteUrl}) {
    addRootDiv();
    handleTokenUrl();
    setupAnalyticsScript({siteUrl});
}

function init() {
    const customSiteUrl = getSiteUrl();
    const siteUrl = customSiteUrl || window.location.origin;
    setup({siteUrl});
    ReactDOM.render(
        <React.StrictMode>
            <App siteUrl={siteUrl} customSiteUrl={customSiteUrl} />
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
