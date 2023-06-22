import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import {ROOT_DIV_ID} from './utils/constants';

function addRootDiv() {
    let scriptTag = document.currentScript;

    if (!scriptTag && import.meta.env.DEV) {
        // In development mode, use any script tag (because in ESM mode, document.currentScript is not set)
        scriptTag = document.querySelector('script[data-ghost-comments]');
    }

    // We need to inject the comment box at the same place as the script tag
    if (scriptTag) {
        const elem = document.createElement('div');
        elem.id = ROOT_DIV_ID;
        scriptTag.parentElement.insertBefore(elem, scriptTag);
    } else if (import.meta.env.DEV) {
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
    let dataset = scriptTag?.dataset;

    if (!scriptTag && process.env.NODE_ENV === 'development') {
        // Use queryparams in test mode
        dataset = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    } else if (!scriptTag) {
        return {};
    }

    const siteUrl = dataset.ghostComments;
    const apiKey = dataset.key;
    const apiUrl = dataset.api;
    const adminUrl = dataset.admin;
    const postId = dataset.postId;
    const colorScheme = dataset.colorScheme;
    const avatarSaturation = dataset.avatarSaturation;
    const accentColor = dataset.accentColor;
    const commentsEnabled = dataset.commentsEnabled;
    const title = dataset.title === 'null' ? null : dataset.title;
    const showCount = dataset.count === 'true';
    const publication = dataset.publication ?? ''; // TODO: replace with dynamic data from script

    return {siteUrl, apiKey, apiUrl, postId, adminUrl, colorScheme, avatarSaturation, accentColor, commentsEnabled, title, showCount, publication};
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

    try {
        setup({siteUrl});

        ReactDOM.render(
            <React.StrictMode>
                {<App customSiteUrl={customSiteUrl} siteUrl={siteUrl} {...siteData} />}
            </React.StrictMode>,
            document.getElementById(ROOT_DIV_ID)
        );
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
    }
}

init();
