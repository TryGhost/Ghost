import type {AddonInstallRecord, HostCapabilities, SerializedRequest, SerializedResponse} from '../types.ts';

const ADMIN_API_PREFIX = '/ghost/api/admin/';
const BLOCKED_REQUEST_HEADERS = new Set(['cookie', 'authorization', 'x-ghost-dev-identity']);

export interface FetchIdentity {
    id: string;
    email: string;
}

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers ?? {})) {
        if (!BLOCKED_REQUEST_HEADERS.has(name.toLowerCase())) {
            result[name] = value;
        }
    }
    return result;
}

async function serializeResponse(response: Response): Promise<SerializedResponse> {
    return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
    };
}

/**
 * Executes add-on requests in the trusted host realm without exposing ambient
 * credentials to the sandbox. Admin API requests use the author's existing
 * Ghost session; provider requests are restricted to the installed backend
 * origin and carry only the explicit prototype identity envelope.
 */
export async function hostFetch(
    install: AddonInstallRecord,
    identity: FetchIdentity | null,
    request: SerializedRequest
): Promise<SerializedResponse> {
    const headers = sanitizeHeaders(request.headers);
    const init: RequestInit = {method: request.method ?? 'GET', body: request.body};

    let url: URL;
    if (request.url.startsWith(ADMIN_API_PREFIX)) {
        url = new URL(request.url, window.location.origin);
        init.credentials = 'include';
        init.headers = {'app-pragma': 'no-cache', ...(request.body ? {'content-type': 'application/json'} : {}), ...headers};
    } else {
        if (!install.backend) {
            throw new Error('This add-on has not declared a backend origin');
        }
        url = new URL(request.url);
        if (url.origin !== new URL(install.backend).origin) {
            throw new Error(`ghost.fetch may only reach the declared backend origin (${install.backend})`);
        }
        init.credentials = 'omit';
        init.referrerPolicy = 'no-referrer';
        init.headers = {
            ...headers,
            'x-ghost-dev-identity': JSON.stringify({unsigned: true, site: window.location.origin, user: identity})
        };
    }

    return serializeResponse(await fetch(url, init));
}

export function createEditorFetchCapability(install: AddonInstallRecord): Pick<HostCapabilities, 'fetch'> {
    return {fetch: request => hostFetch(install, null, request)};
}
