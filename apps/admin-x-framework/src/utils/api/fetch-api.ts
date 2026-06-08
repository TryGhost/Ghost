import * as Sentry from '@sentry/react';
import {useFramework} from '../../providers/framework-provider';
import {APIError, MaintenanceError, ServerUnreachableError, TimeoutError} from '../errors';
import {getGhostPaths} from '../helpers';
import handleResponse from './handle-response';

export interface RequestOptions {
    method?: string;
    body?: string | FormData;
    headers?: {
        'Content-Type'?: string;
    };
    credentials?: 'include' | 'omit' | 'same-origin';
    timeout?: number;
    retry?: boolean;
    onUploadProgress?: (progress: number) => void;
}

type InternalRequestInit = Required<
    Pick<RequestInit, 'method' | 'credentials' | 'mode'>
> & {
    headers: Record<string, string>;
    body: undefined | null | string | FormData;
    signal: AbortSignal;
};

const xhrHeadersToFetchHeaders = (xhr: Readonly<XMLHttpRequest>): Headers => {
    const result = new Headers();
    const headerLines = xhr.getAllResponseHeaders()?.split('\r\n') || [];
    for (const headerLine of headerLines) {
        // See the "Field Syntax" section of [the HTTP 1.1 spec][0].
        // [0]: https://datatracker.ietf.org/doc/html/rfc9112#name-field-syntax
        const separatorIndex = headerLine.indexOf(':');
        if (separatorIndex === -1) {
            continue;
        }
        const headerName = headerLine.slice(0, separatorIndex);
        const headerValue = headerLine.slice(separatorIndex + 1).trim();
        result.append(headerName, headerValue);
    }
    return result;
};

const xhrToFetchResponse = (xhr: Readonly<XMLHttpRequest>): Response => (
    new Response(xhr.response, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: xhrHeadersToFetchHeaders(xhr)
    })
);

const fetchWithXhr = (
    onUploadProgress: (progress: number) => void,
    endpoint: string | URL,
    {method, headers, credentials, body, signal}: InternalRequestInit
): Promise<Response> => (
    new Promise((resolve, reject) => {
        const onabort = () => {
            reject(new DOMException('Aborted', 'AbortError'));
        };

        // It's possible that the signal is already aborted if this isn't the
        // first time the request was attempted.
        if (signal.aborted) {
            onabort();
            return;
        }

        const xhr = new XMLHttpRequest();

        xhr.open(method, endpoint.toString(), true);
        switch (credentials) {
        case 'omit':
            throw new Error(
                '"omit" credentials cannot be represented with legacy XMLHttpRequest. Consider "same-origin".'
            );
        case 'same-origin':
            xhr.withCredentials = false;
            break;
        case 'include':
            xhr.withCredentials = true;
            break;
        default:
            throw new Error(credentials satisfies never);
        }
        xhr.responseType = 'arraybuffer';

        for (const [headerName, headerValue] of Object.entries(headers)) {
            xhr.setRequestHeader(headerName, headerValue);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onUploadProgress(progress);
            }
        };

        xhr.onload = () => {
            resolve(xhrToFetchResponse(xhr));
        };

        xhr.onerror = () => {
            // This is a TypeError in the Fetch API, so we copy that.
            reject(new TypeError('Network request failed'));
        };

        xhr.onabort = onabort;

        const onSignalAbort = () => xhr.abort();
        signal.addEventListener('abort', onSignalAbort);
        xhr.onloadend = () => {
            signal.removeEventListener('abort', onSignalAbort);
        };

        xhr.send(body);
    })
);

export const useFetchApi = () => {
    const {ghostVersion, sentryDSN} = useFramework();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async <ResponseData = any>(
        endpoint: string | URL,
        {
            method = 'GET',
            headers = {},
            body,
            credentials = 'include',
            timeout,
            retry = true,
            onUploadProgress
        }: RequestOptions = {}
    ): Promise<ResponseData> => {
        const controller = new AbortController();

        const requestInit: InternalRequestInit = {
            method,
            headers: {
                'app-pragma': 'no-cache',
                // Only include version header if ghostVersion is provided
                // This allows forward admin deployments to skip version checks
                ...(ghostVersion ? {'x-ghost-version': ghostVersion} : {}),
                // By default, we set the Content-Type header to application/json
                ...(typeof body === 'string' ? {['content-type']: 'application/json'} : {}),
                ...headers
            },
            credentials,
            mode: 'cors',
            body,
            signal: controller.signal
        };

        // attempt retries for 15 seconds in two situations:
        // 1. Server Unreachable error from the browser (code 0 or TypeError), typically from short internet blips
        // 2. Maintenance error from Ghost, upgrade in progress so API is temporarily unavailable
        let attempts = 0;
        let retryingMs = 0;
        const startTime = Date.now();
        const maxRetryingMs = 15_000;
        const retryPeriods = [500, 1000];
        const retryableErrors = [ServerUnreachableError, MaintenanceError, TypeError];

        const getErrorData = (error?: APIError, response?: Response) => {
            const data: Record<string, unknown> = {
                errorName: error?.name,
                attempts,
                totalSeconds: retryingMs / 1000,
                endpoint: endpoint.toString()
            };
            if (endpoint.toString().includes('/ghost/api/')) {
                data.server = response?.headers.get('server');
            }
            return data;
        };

        // Only `XMLHttpRequest` supports progress, so we use that if we have to.
        // Otherwise, we prefer `fetch`.
        const fetchFn = onUploadProgress ? fetchWithXhr.bind(null, onUploadProgress) : fetch;

        const timeoutHandle = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

        try {
            while (attempts === 0 || retry) {
                try {
                    const response = await fetchFn(endpoint, requestInit);
                    return handleResponse(response) as ResponseData;
                } catch (error) {
                    retryingMs = Date.now() - startTime;

                    if (retry && (import.meta.env.MODE !== 'development' && retryableErrors.some(errorClass => error instanceof errorClass) && retryingMs <= maxRetryingMs)) {
                        await new Promise((resolve) => {
                            setTimeout(resolve, retryPeriods[attempts] || retryPeriods[retryPeriods.length - 1]);
                        });
                        attempts += 1;
                        continue;
                    }

                    if (attempts !== 0 && sentryDSN) {
                        Sentry.captureMessage('Request failed after multiple attempts', {extra: getErrorData()});
                    }

                    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
                        throw new TimeoutError();
                    }

                    let newError = error;

                    if (!(error instanceof APIError)) {
                        newError = new ServerUnreachableError({cause: error});
                    }

                    throw newError;
                };
            }
        } finally {
            clearTimeout(timeoutHandle);
        }

        // Used for type checking
        // this can't happen, but TS isn't smart enough to undeerstand that the loop will never exit without an error or return
        // because of retry + attempts usage combination
        return undefined as never;
    };
};

const {apiRoot, activityPubRoot} = getGhostPaths();

export const apiUrl = (path: string, searchParams: Record<string, string> = {}, useActivityPub: boolean = false) => {
    const root = useActivityPub ? activityPubRoot : apiRoot;
    const url = new URL(`${root}${path}`, window.location.origin);
    url.search = new URLSearchParams(searchParams).toString();
    return url.toString();
};
