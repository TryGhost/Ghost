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

function getCommentsPlaceholder(): HTMLElement | null {
    // Look for the placeholder div output by the {{comments}} helper
    // This div contains post-specific data attributes
    const placeholder = document.querySelector('[data-ghost-comments]') as HTMLElement;
    return placeholder;
}

function getRootDiv(placeholder: HTMLElement | null): HTMLElement {
    // If we have a placeholder div, use it directly as the root
    // (the {{comments}} helper outputs an empty div we can render into)
    if (placeholder) {
        placeholder.id = ROOT_DIV_ID;
        return placeholder;
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
    // Find the placeholder div output by {{comments}} helper
    // It contains post-specific data attributes (post-id, color-scheme, etc.)
    const placeholder = getCommentsPlaceholder();

    // If no placeholder found, comments aren't needed on this page
    if (!placeholder) {
        return;
    }

    // Dynamically import the App to enable code splitting
    const {default: App} = await import('./App');

    const root = getRootDiv(placeholder);
    const initialCommentId = parseCommentIdFromHash(window.location.hash);
    const pageUrl = getPageUrl();

    handleTokenUrl();

    // Merge loader config with placeholder data attributes
    // Placeholder has post-specific data (post-id, color-scheme, etc.)
    const placeholderData = placeholder.dataset;

    // Build options from merged config
    const options = {
        siteUrl: placeholderData.ghostComments || config.ghost || window.location.origin,
        apiKey: placeholderData.key || config.key,
        apiUrl: placeholderData.api || config['api-url'] || `${config.ghost}/members/api/`,
        postId: placeholderData.postId || config['post-id'] || '',
        adminUrl: placeholderData.admin || config['admin-url'] || '',
        colorScheme: placeholderData.colorScheme || config['color-scheme'] || 'auto',
        avatarSaturation: placeholderData.avatarSaturation ? parseInt(placeholderData.avatarSaturation) : (config['avatar-saturation'] ? parseInt(config['avatar-saturation']) : 60),
        accentColor: placeholderData.accentColor || config['accent-color'] || '#000000',
        commentsEnabled: placeholderData.commentsEnabled || config['comments-enabled'] || 'all',
        publication: placeholderData.publication || config.publication || '',
        locale: placeholderData.locale || config.locale || 'en',
        title: placeholderData.title || null,
        showCount: placeholderData.count !== 'false',
        inlineStyles: commentsStyles
    };

    // Render React app
    createRoot(root).render(
        createElement(App, {
            scriptTag: placeholder,
            initialCommentId,
            pageUrl,
            options
        })
    );
}

export {commentsStyles};
