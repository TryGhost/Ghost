import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {ROOT_DIV_ID} from './utils/constants';

function addRootDiv() {
    const scriptTag = document.querySelector('script[data-ghost-comments]');

    // We need to inject the comment box at the same place as the script tag
    if (scriptTag) {
        const elem = document.createElement('div');
        elem.id = ROOT_DIV_ID;
        scriptTag.parentElement.insertBefore(elem, scriptTag);
    } else if (process.env.NODE_ENV === 'development') {
        const elem = document.createElement('div');
        elem.id = ROOT_DIV_ID;
        document.body.appendChild(elem);
    } else {
        // eslint-disable-next-line no-console
        console.warn('[Comments] Comment box location was not found: could not load comments box.');
    }
}

function getSiteData() {
    /**
     * @type {HTMLElement}
     */
    const scriptTag = document.querySelector('script[data-ghost-comments]');
    if (scriptTag) {
        const siteUrl = scriptTag.dataset.ghostComments;
        const apiKey = scriptTag.dataset.key;
        const apiUrl = scriptTag.dataset.api;
        const adminUrl = scriptTag.dataset.admin;
        const sentryDsn = scriptTag.dataset.sentryDsn;
        const postId = scriptTag.dataset.postId;
        const colorScheme = scriptTag.dataset.colorScheme;
        const avatarSaturation = scriptTag.dataset.avatarSaturation;
        const accentColor = scriptTag.dataset.accentColor;
        const appVersion = scriptTag.dataset.appVersion;
        const commentsEnabled = scriptTag.dataset.commentsEnabled;
        const stylesUrl = scriptTag.dataset.styles;
        const title = scriptTag.dataset.title === 'null' ? null : scriptTag.dataset.title;
        const showCount = scriptTag.dataset.count === 'true';

        return {siteUrl, stylesUrl, apiKey, apiUrl, sentryDsn, postId, adminUrl, colorScheme, avatarSaturation, accentColor, appVersion, commentsEnabled, title, showCount};
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
    const {siteUrl: customSiteUrl, ...siteData} = getSiteData();
    const siteUrl = customSiteUrl || window.location.origin;
    setup({siteUrl});

    ReactDOM.render(
        <React.StrictMode>
            {<App siteUrl={siteUrl} customSiteUrl={customSiteUrl} {...siteData} />}
        </React.StrictMode>,
        document.getElementById(ROOT_DIV_ID)
    );
}

init();
