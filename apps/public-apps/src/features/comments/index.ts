/**
 * Comments Feature
 *
 * Full commenting system for Ghost posts.
 * Provides comment threads, replies, likes, and moderation.
 */

import {createRoot} from 'react-dom/client';
import {createElement} from 'react';
import type {LoaderConfig} from '../../loader';

// Import CSS as inline string - bundled directly into JS
import commentsStyles from './styles/comments.css?inline';

const ROOT_DIV_ID = 'ghost-comments-root';

export interface CommentsConfig extends LoaderConfig {
    'comments-enabled'?: string;
    'post-id'?: string;
    'color-scheme'?: string;
    'avatar-saturation'?: string;
    'accent-color'?: string;
    'app-version'?: string;
    'comments-count'?: string;
    publication?: string;
}

function getScriptTag(config: CommentsConfig): HTMLElement | null {
    // Try to find by data attribute
    const scriptTag = document.querySelector('script[data-ghost-comments]') as HTMLElement;
    return scriptTag;
}

function getRootDiv(scriptTag: HTMLElement | null): HTMLElement {
    // If we have a script tag, insert before it
    if (scriptTag?.previousElementSibling?.id === ROOT_DIV_ID) {
        return scriptTag.previousElementSibling as HTMLElement;
    }

    if (scriptTag?.parentElement) {
        const elem = document.createElement('div');
        elem.id = ROOT_DIV_ID;
        scriptTag.parentElement.insertBefore(elem, scriptTag);
        return elem;
    }

    // Fallback: append to body
    let root = document.getElementById(ROOT_DIV_ID);
    if (!root) {
        root = document.createElement('div');
        root.id = ROOT_DIV_ID;
        document.body.appendChild(root);
    }
    return root;
}

function parseCommentIdFromHash(hash: string): string | null {
    if (!hash || !hash.startsWith('#ghost-comments-')) {
        return null;
    }
    return hash.replace('#ghost-comments-', '');
}

function getPageUrl(): string {
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
}

function handleTokenUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('token')) {
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.href);
    }
}

export async function initComments(config: CommentsConfig): Promise<void> {
    // Dynamically import the App to enable code splitting
    const {default: App} = await import('./App');

    const scriptTag = getScriptTag(config);
    const root = getRootDiv(scriptTag);
    const initialCommentId = parseCommentIdFromHash(window.location.hash);
    const pageUrl = getPageUrl();

    handleTokenUrl();

    // Build options from config
    const options = {
        siteUrl: config.ghost || window.location.origin,
        apiKey: config.key,
        apiUrl: config['api-url'] || `${config.ghost}/members/api/`,
        postId: config['post-id'] || '',
        adminUrl: config['admin-url'] || '',
        colorScheme: config['color-scheme'] || 'auto',
        avatarSaturation: config['avatar-saturation'] ? parseInt(config['avatar-saturation']) : 60,
        accentColor: config['accent-color'] || '#000000',
        commentsEnabled: config['comments-enabled'] || 'all',
        publication: config.publication || '',
        locale: config.locale || 'en',
        inlineStyles: commentsStyles
    };

    // Render React app
    createRoot(root).render(
        createElement(App, {
            scriptTag,
            initialCommentId,
            pageUrl,
            options
        })
    );
}

export {commentsStyles};
