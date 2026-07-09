import {useMemo, useRef} from 'react';
import {toast} from 'sonner';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import type {AddonInstallRecord, HostCapabilities, SerializedRequest, SerializedResponse} from '../types.ts';

/**
 * Builds the host side of the `ghost` bridge for one install. Everything here
 * executes on the host: the sandbox only ever holds proxied async functions,
 * so credentials never enter the sandbox realm.
 */

const ADMIN_API_PREFIX = '/ghost/api/admin/';

// Headers an add-on may not set: the host owns credentials and identity.
const BLOCKED_REQUEST_HEADERS = new Set(['cookie', 'authorization', 'x-ghost-dev-identity']);

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

interface FetchIdentity {
    id: string;
    email: string;
}

async function hostFetch(
    install: AddonInstallRecord,
    identity: FetchIdentity | null,
    request: SerializedRequest
): Promise<SerializedResponse> {
    const headers = sanitizeHeaders(request.headers);
    const init: RequestInit = {
        method: request.method ?? 'GET',
        body: request.body
    };

    let url: URL;
    if (request.url.startsWith(ADMIN_API_PREFIX)) {
        // Spike-only full passthrough to the instance's own Admin API, behind
        // the labs flag. No compatibility promise: the permissions revamp
        // narrows this to granted resources before add-ons ship publicly.
        url = new URL(request.url, window.location.origin);
        init.credentials = 'include';
        init.headers = {
            'app-pragma': 'no-cache',
            ...(request.body ? {'content-type': 'application/json'} : {}),
            ...headers
        };
    } else {
        if (!install.backend) {
            throw new Error('This add-on has not declared a backend origin');
        }
        url = new URL(request.url);
        if (url.origin !== new URL(install.backend).origin) {
            throw new Error(`ghost.fetch may only reach the declared backend origin (${install.backend})`);
        }
        init.credentials = 'omit';
        init.headers = {
            ...headers,
            // Explicitly-unsigned dev stub. Production replaces this value
            // with a short-lived, audience-bound, Ghost-signed token — the
            // plumbing (host-side attach, sandbox blindness) stays identical.
            'x-ghost-dev-identity': JSON.stringify({
                unsigned: true,
                site: window.location.origin,
                user: identity
            })
        };
    }

    const response = await fetch(url, init);
    return serializeResponse(response);
}

export function useHostCapabilities(install: AddonInstallRecord): HostCapabilities {
    const navigate = useNavigate();
    const {data: currentUser} = useCurrentUser();

    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;
    const identityRef = useRef<FetchIdentity | null>(null);
    identityRef.current = currentUser ? {id: currentUser.id, email: currentUser.email} : null;

    return useMemo<HostCapabilities>(() => ({
        async showToast(message, options) {
            if (options?.type === 'error') {
                toast.error(message);
            } else if (options?.type === 'success') {
                toast.success(message);
            } else {
                toast(message);
            }
        },
        async navigate(path) {
            if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
                throw new Error('ghost.navigate expects an absolute admin path like "/apps/my-addon"');
            }
            navigateRef.current(path);
        },
        fetch(request) {
            return hostFetch(install, identityRef.current, request);
        }
    }), [install]);
}
