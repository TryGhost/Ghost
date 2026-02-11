/**
 * Public Apps Loader
 *
 * Lightweight entry point that:
 * 1. Reads config from script tag data attributes
 * 2. Dynamically imports only the features needed
 * 3. Initializes each feature with shared runtime
 *
 * Expected script tag format:
 * <script defer src="/public-apps/loader.js?v={hash}"
 *         data-ghost="https://site.com"
 *         data-features="announcement,portal,search,comments"
 *         data-key="CONTENT_API_KEY"
 *         data-locale="en">
 * </script>
 */

export interface LoaderConfig {
    ghost: string;
    key?: string;
    features: string[];
    locale: string;
    // Feature-specific config passed via data attributes
    [key: string]: unknown;
}

function getConfig(): LoaderConfig {
    // For ES modules, document.currentScript is null, so find script by URL
    // import.meta.url gives us the module URL which matches the script src
    const scriptUrl = new URL(import.meta.url);
    const scripts = document.querySelectorAll('script[src]');
    let script: HTMLScriptElement | null = null;

    for (const s of scripts) {
        const src = (s as HTMLScriptElement).src;
        if (src && new URL(src).pathname === scriptUrl.pathname) {
            script = s as HTMLScriptElement;
            break;
        }
    }

    if (!script) {
        throw new Error('Public apps loader script tag not found');
    }

    const features = (script.dataset.features || '').split(',').filter(Boolean);

    // Spread dataset first, then override with parsed values
    // This ensures features is an array, not the raw string from dataset
    return {
        ...script.dataset,
        ghost: script.dataset.ghost || window.location.origin,
        key: script.dataset.key,
        features,
        locale: script.dataset.locale || 'en'
    };
}

async function loadFeature(name: string, config: LoaderConfig): Promise<void> {
    switch (name) {
    case 'announcement': {
        const {initAnnouncement} = await import('./features/announcement');
        await initAnnouncement(config);
        break;
    }
    case 'search': {
        const {initSearch} = await import('./features/search');
        await initSearch(config);
        break;
    }
    case 'comments': {
        const {initComments} = await import('./features/comments');
        await initComments(config);
        break;
    }
    // Future features:
    // case 'portal': {
    //     const { initPortal } = await import('./features/portal');
    //     await initPortal(config);
    //     break;
    // }
    default:
        console.warn(`[public-apps] Unknown feature: ${name}`);
    }
}

async function init(): Promise<void> {
    const config = getConfig();

    if (config.features.length === 0) {
        return; // Nothing to load
    }

    // Load all requested features in parallel
    await Promise.all(
        config.features.map(feature => loadFeature(feature.trim(), config))
    );
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing
export {getConfig, loadFeature};
