/**
 * Portal Feature - Entry Point
 *
 * Membership portal for Ghost sites.
 * Handles sign-up, sign-in, account management, and Stripe payments.
 */

import {createRoot} from 'react-dom/client';
import {createElement} from 'react';
import type {LoaderConfig} from '../../loader';

const ROOT_DIV_ID = 'ghost-portal-root';

export interface PortalConfig extends LoaderConfig {
    i18n?: string;
    api?: string;
    'accent-color'?: string;
}

function addRootDiv(): HTMLElement {
    let elem = document.getElementById(ROOT_DIV_ID);
    if (!elem) {
        elem = document.createElement('div');
        elem.id = ROOT_DIV_ID;
        elem.setAttribute('data-testid', 'portal-root');
        document.body.appendChild(elem);
    }
    return elem;
}

function handleTokenUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

export async function initPortal(config: PortalConfig): Promise<void> {
    // Dynamically import the App to enable code splitting
    const {default: App} = await import('./app');

    const root = addRootDiv();
    handleTokenUrl();

    const siteUrl = config.ghost || window.location.origin;
    const siteI18nEnabled = config.i18n === 'true';

    // Render React app using React 18 API
    createRoot(root).render(
        createElement(App, {
            siteUrl,
            customSiteUrl: config.ghost,
            apiKey: config.key,
            apiUrl: config.api,
            siteI18nEnabled,
            locale: config.locale || 'en'
        })
    );
}
