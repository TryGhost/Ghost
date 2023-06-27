import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import {ROOT_DIV_ID} from './utils/constants';

function getScriptTag(): HTMLElement {
    let scriptTag = document.currentScript as HTMLElement | null;

    if (!scriptTag && import.meta.env.DEV) {
        // In development mode, use any script tag (because in ESM mode, document.currentScript is not set)
        scriptTag = document.querySelector('script[data-ghost-comments]');
    }

    if (!scriptTag) {
        throw new Error('[Comments-UI] Cannot find current script tag');
    }

    return scriptTag;
}

/**
 * Returns a div to mount the React application into, creating it if necessary
 */
function getRootDiv(scriptTag: HTMLElement) {
    if (scriptTag.previousElementSibling && scriptTag.previousElementSibling.id === ROOT_DIV_ID) {
        return scriptTag.previousElementSibling;
    }

    if (!scriptTag.parentElement) {
        throw new Error('[Comments-UI] Script tag does not have a parent element');
    }

    const elem = document.createElement('div');
    elem.id = ROOT_DIV_ID;
    scriptTag.parentElement.insertBefore(elem, scriptTag);
    return elem;
}

function getSiteData(scriptTag: HTMLElement) {
    /**
     * @type {HTMLElement}
     */
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
    const avatarSaturation = dataset.avatarSaturation ? parseInt(dataset.avatarSaturation) : undefined;
    const accentColor = dataset.accentColor ?? '#000000';
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

function init() {
    const scriptTag = getScriptTag();
    const root = getRootDiv(scriptTag);

    // const customSiteUrl = getSiteUrl();
    const {siteUrl: customSiteUrl, ...siteData} = getSiteData(scriptTag);
    const siteUrl = customSiteUrl || window.location.origin;

    try {
        handleTokenUrl();

        ReactDOM.render(
            <React.StrictMode>
                {<App customSiteUrl={customSiteUrl} siteUrl={siteUrl} {...siteData} />}
            </React.StrictMode>,
            root
        );
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
    }
}

init();
