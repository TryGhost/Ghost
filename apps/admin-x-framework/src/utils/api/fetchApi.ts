import * as Sentry from '@sentry/react';
import {useFramework} from '../../providers/FrameworkProvider';
import {APIError, MaintenanceError, ServerUnreachableError, TimeoutError} from '../errors';
import {getGhostPaths} from '../helpers';
import handleResponse from './handleResponse';

export interface RequestOptions {
    method?: string;
    body?: string | FormData;
    headers?: {
        'Content-Type'?: string;
    };
    credentials?: 'include' | 'omit' | 'same-origin';
    timeout?: number;
    retry?: boolean;
}

export const useFetchApi = () => {
    const {ghostVersion, sentryDSN} = useFramework();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async <ResponseData = any>(endpoint: string | URL, {headers = {}, retry, ...options}: RequestOptions = {}): Promise<ResponseData> => {
        // By default, we set the Content-Type header to application/json
        const defaultHeaders: Record<string, string> = {
            'app-pragma': 'no-cache',
            'x-ghost-version': ghostVersion
        };
        if (typeof options.body === 'string') {
            defaultHeaders['content-type'] = 'application/json';
        }

        const controller = new AbortController();
        const {timeout} = options;

        if (timeout) {
            setTimeout(() => controller.abort(), timeout);
        }

        // attempt retries for 15 seconds in two situations:
        // 1. Server Unreachable error from the browser (code 0 or TypeError), typically from short internet blips
        // 2. Maintenance error from Ghost, upgrade in progress so API is temporarily unavailable
        let attempts = 0;
        const shouldRetry = retry !== false;
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

        while (attempts === 0 || shouldRetry) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        ...defaultHeaders,
                        ...headers
                    },
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'include',
                    signal: controller.signal,
                    ...options
                });

                return handleResponse(response) as ResponseData;
            } catch (error) {
                retryingMs = Date.now() - startTime;

                if (shouldRetry && (import.meta.env.MODE !== 'development' && retryableErrors.some(errorClass => error instanceof errorClass) && retryingMs <= maxRetryingMs)) {
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

        // Used for type checking
        // this can't happen, but TS isn't smart enough to undeerstand that the loop will never exit without an error or return
        // because of shouldRetry + attemps usage combination
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
