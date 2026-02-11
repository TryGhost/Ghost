/**
 * Search Feature
 *
 * Full-text search modal for Ghost sites.
 * Provides search across posts, authors, and tags.
 */

import {createRoot} from 'react-dom/client';
import {createElement} from 'react';
import type {LoaderConfig} from '../../loader';

// Import CSS as inline string - bundled directly into JS
import searchStyles from './search.css?inline';

const ROOT_DIV_ID = 'sodo-search-root';

export interface SearchConfig extends LoaderConfig {
    styles?: string;
}

// Export the inlined styles for use in iframe
export {searchStyles};

export async function initSearch(config: SearchConfig): Promise<void> {
    // Dynamically import the App to enable code splitting
    const {default: App} = await import('./App');

    // Create root element
    const root = document.createElement('div');
    root.id = ROOT_DIV_ID;
    document.body.appendChild(root);

    const adminUrl = (config.ghost || window.location.origin).replace(/\/+$/, '');

    // Render React app - pass inline styles instead of URL
    createRoot(root).render(
        createElement(App, {
            adminUrl,
            apiKey: config.key,
            inlineStyles: searchStyles,
            locale: config.locale || 'en'
        })
    );
}
