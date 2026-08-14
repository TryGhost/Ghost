/* eslint ghost/ghost-custom/no-native-error: off */

/**
 * Admin API theme calls for edit mode. Same-origin only (the loader refuses
 * split-admin installs), authenticated by the admin session cookie
 * (`credentials: 'include'`) — the exact pattern of apps/admin's
 * theme-code-editor-modal.tsx.
 */

function apiUrl(adminUrl, path) {
    return `${adminUrl}api/admin/${path}`;
}

/**
 * gscan validation failure (HTTP 422) or any other upload rejection, with the
 * server's error list flattened into a readable message.
 */
export class ThemeUploadError extends Error {
    /**
     * @param {string} message
     * @param {{status: number, errors?: Array<Object>}} details
     */
    constructor(message, {status, errors = []}) {
        super(message);
        this.name = 'ThemeUploadError';
        this.status = status;
        this.errors = errors;
    }
}

/**
 * Flattens an Admin API error list (gscan 422s carry {message, context,
 * failures: [{ref, message}]}) into one readable multi-line string.
 */
export function formatUploadErrors(errors) {
    const lines = [];

    for (const error of errors) {
        if (error?.message) {
            lines.push(error.context ? `${error.message} — ${error.context}` : error.message);
        }

        for (const failure of error?.failures ?? []) {
            if (failure?.message || failure?.ref) {
                lines.push(`  • ${[failure.ref, failure.message].filter(Boolean).join(': ')}`);
            }
        }
    }

    return lines.join('\n');
}

/** GET /themes/active/ → the active theme's name. */
export async function fetchActiveThemeName(adminUrl, fetchImpl = fetch) {
    const response = await fetchImpl(apiUrl(adminUrl, 'themes/active/'), {
        credentials: 'include',
        headers: {Accept: 'application/json'}
    });

    if (!response.ok) {
        throw new Error(`edit_mode_active_theme_failed:${response.status}`);
    }

    const data = await response.json();
    const name = data?.themes?.[0]?.name;

    if (!name) {
        throw new Error('edit_mode_active_theme_missing');
    }

    return name;
}

/** GET /themes/:name/download/ → the theme zip as an ArrayBuffer. */
export async function downloadThemeArchive(adminUrl, themeName, fetchImpl = fetch) {
    const response = await fetchImpl(apiUrl(adminUrl, `themes/${encodeURIComponent(themeName)}/download/`), {
        credentials: 'include',
        headers: {Accept: 'application/zip, application/octet-stream, */*'}
    });

    if (!response.ok) {
        throw new Error(`edit_mode_theme_download_failed:${response.status}`);
    }

    return response.arrayBuffer();
}

/**
 * POST /themes/upload/ — multipart field `file`. The zip FILENAME determines
 * the installed theme name, so it must be `<themeName>.zip`: uploading under
 * the active theme's name overwrites it in place and Ghost re-activates it.
 *
 * @param {string} adminUrl
 * @param {{themeName: string, blob: Blob}} upload
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Object>} the uploaded theme object from the response
 */
export async function uploadThemeArchive(adminUrl, {themeName, blob}, fetchImpl = fetch) {
    const formData = new FormData();
    formData.append('file', blob, `${themeName}.zip`);

    const response = await fetchImpl(apiUrl(adminUrl, 'themes/upload/'), {
        method: 'POST',
        credentials: 'include',
        headers: {Accept: 'application/json'},
        body: formData
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const errors = data?.errors ?? [];
        const formatted = formatUploadErrors(errors);
        const message = response.status === 422
            ? `Theme not published — the edited theme failed validation:\n${formatted || 'unknown validation error'}`
            : (formatted || `Theme upload failed (${response.status})`);

        throw new ThemeUploadError(message, {status: response.status, errors});
    }

    const uploadedTheme = data?.themes?.[0];

    if (!uploadedTheme) {
        throw new ThemeUploadError('Theme upload succeeded but returned no theme', {status: response.status});
    }

    return uploadedTheme;
}
