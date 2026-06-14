// Prototype: a media library picker wired into the Koenig editor's "add media"
// flows without any Koenig change.
//
// A single capture-phase click listener catches the hidden file inputs the
// editor cards use to open the native file browser, stops the native dialog,
// and opens the Ghost media library instead. A pick is delivered back through
// the same input so the editor's normal upload flow runs; the upload hook
// recognises it as an existing file (see use-koenig-file-upload) and reuses its
// URL instead of creating a duplicate.
//
// Self-contained and easy to remove: delete this file to drop the feature, or
// disable at runtime with localStorage.setItem('mediaLibraryPickerOff', '1').
// A future labs flag would gate the listener install in initialize().

import config from 'ghost-admin/config/environment';
import fetch from 'fetch';
import {cardKindFor, getMediaInput} from 'ghost-admin/utils/media-library-picker-helpers';
import {prefixAssetUrl} from 'ghost-admin/utils/asset-base';

// Load the picker from the admin-x-settings bundle on first use, the same way
// the editor itself is loaded (dynamic import of the built asset).
let selectorModule;
function loadSelector() {
    if (!selectorModule) {
        const assetUrl = prefixAssetUrl(`assets/admin-x-settings/${config.adminXSettingsFilename || 'admin-x-settings.js'}`);
        const url = new URL(assetUrl, window.location.origin);
        selectorModule = url.protocol === 'http:'
            ? import(`http://${url.host}${url.pathname}${url.search}`)
            : import(`https://${url.host}${url.pathname}${url.search}`);
    }
    return selectorModule;
}

// Deliver picked items back through the input so the editor's normal flow runs.
// Each item is fetched into a real File (so previews and dimensions work) and
// registered as a library reference so the upload hook reuses its URL.
async function deliver(input, items) {
    const references = window.__mediaLibraryReferences || (window.__mediaLibraryReferences = new WeakMap());
    const dataTransfer = new DataTransfer();

    for (const item of items) {
        const response = await fetch(item.url);
        // Guard against a CDN/permission error becoming a "file" of error HTML.
        if (!response.ok) {
            throw new Error(`Failed to fetch ${item.url} (${response.status})`);
        }
        const blob = await response.blob();
        const file = new File([blob], item.filename, {type: blob.type});
        references.set(file, item.url);
        dataTransfer.items.add(file);
    }

    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', {bubbles: true}));
}

// Lets the picker hand back to the native file dialog. Re-opening it must happen
// inside a live user gesture (the picker's Upload button click), so we flag the
// resulting click and let our own listener pass it through untouched. input.click()
// dispatches synchronously, so the flag is already consumed by our capture
// listener before the finally resets it.
let bypassNextClick = false;
function openNativeDialog(input) {
    bypassNextClick = true;
    try {
        input.click();
    } finally {
        bypassNextClick = false;
    }
}

export function initialize(appInstance) {
    if (window.__mediaLibraryPickerInstalled) {
        return;
    }
    window.__mediaLibraryPickerInstalled = true;

    document.addEventListener('click', (event) => {
        if (bypassNextClick || localStorage.getItem('mediaLibraryPickerOff')) {
            return;
        }

        const input = getMediaInput(event.target);
        if (!input) {
            return;
        }

        // Gated by the private mediaLibrary flag. When off, leave today's native
        // dialog untouched (checked here, before preventDefault, so nothing changes).
        if (!appInstance.lookup('service:feature')?.get('mediaLibrary')) {
            return;
        }

        // Stop the native file browser - the library opens instead.
        event.preventDefault();

        // The feature image can take a URL directly (like its Unsplash flow), so
        // we set it without re-uploading. Editor cards go through the upload hook.
        const featureImage = input.closest('.gh-editor-feature-image-container');

        loadSelector()
            .then(module => module.renderMediaLibrarySelector({multiple: input.multiple, cardKind: cardKindFor(input), onUpload: () => openNativeDialog(input)}))
            .then((items) => {
                if (!items.length) {
                    return undefined;
                }
                if (featureImage) {
                    featureImage.dispatchEvent(new CustomEvent('gh-media-library-select', {detail: {url: items[0].url}, bubbles: true}));
                    return undefined;
                }
                // Returned so a delivery failure reaches the catch below.
                return deliver(input, items);
            })
            .catch((error) => {
                // The native dialog was already prevented and cannot be reopened
                // without a fresh user gesture, so surface the failure instead of
                // leaving the click silently doing nothing.
                console.error('[Media library] picker failed', error); // eslint-disable-line no-console
                // Optional-chained: the container may be torn down (navigated away)
                // by the time this async catch runs, so the lookup can be undefined.
                appInstance.lookup('service:notifications')
                    ?.showAlert('Could not open the media library. Please try again.', {type: 'error', key: 'media-library.failed'});
            });
    }, true);
}

export default {
    name: 'media-library-picker',
    initialize
};
