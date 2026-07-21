import {Page} from '@playwright/test';

import newsletterStatsFixture from './responses/newsletter_stats.json';
import topPostsFixture from './responses/top_posts.json';

import {NewsletterStatsResponseType, TopPostsStatsResponseType} from '../api/stats';

interface MockRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    rawResponse?: string | ArrayBuffer | Uint8Array | Buffer;
    responseStatus?: number;
    responseHeaders?: {[key: string]: string};
}

interface RequestRecord {
    url?: string
    body?: object | null
    headers?: {[key: string]: string}
}

export const responseFixtures = {
    newsletterStats: newsletterStatsFixture as NewsletterStatsResponseType,
    topPosts: topPostsFixture as TopPostsStatsResponseType
};

export async function mockApi<Requests extends Record<string, MockRequestConfig>>({page, requests, options = {}}: {page: Page, requests: Requests, options?: {useActivityPub?: boolean}}) {
    const lastApiRequests: {[key in keyof Requests]?: RequestRecord} = {};

    const getResponseBody = (matchingMock: MockRequestConfig) => {
        if (typeof matchingMock.rawResponse === 'string' || Buffer.isBuffer(matchingMock.rawResponse)) {
            return matchingMock.rawResponse;
        }

        if (matchingMock.rawResponse instanceof ArrayBuffer) {
            return Buffer.from(matchingMock.rawResponse);
        }

        if (matchingMock.rawResponse instanceof Uint8Array) {
            return Buffer.from(matchingMock.rawResponse);
        }

        return typeof matchingMock.response === 'string' ? matchingMock.response : JSON.stringify(matchingMock.response);
    };

    const namedRequests = Object.entries(requests).reduce(
        (array, [key, value]) => array.concat({name: key, ...value}),
        [] as Array<MockRequestConfig & {name: keyof Requests}>
    );

    const routeRegex = options?.useActivityPub ? /\/.ghost\/activitypub\// : /\/ghost\/api\/admin\//;
    const routeReplaceRegex = options?.useActivityPub ? /^.*\/.ghost\/activitypub/ : /^.*\/ghost\/api\/admin/;

    await page.route(routeRegex, async (route) => {
        const apiPath = route.request().url().replace(routeReplaceRegex, '');

        const matchingMock = namedRequests.find((request) => {
            if (request.method !== route.request().method()) {
                return false;
            }

            if (typeof request.path === 'string') {
                return request.path === apiPath;
            }

            return request.path.test(apiPath);
        });

        if (!matchingMock) {
            return route.fulfill({
                status: 418,
                body: [
                    'No matching mock found. If this request is needed for the test, add it to your mockApi call',
                    '',
                    'Currently mocked:',
                    ...namedRequests.map(({method, path}) => `${method} ${path}`)
                ].join('\n')
            });
        }

        let requestBody = null;
        try {
            // Try to parse the post data as JSON
            requestBody = JSON.parse(route.request().postData() || 'null');
        } catch {
            // Post data isn't JSON (e.g. file upload) — use the raw post data
            requestBody = route.request().postData();
        }

        lastApiRequests[matchingMock.name] = {
            body: requestBody,
            url: route.request().url(),
            headers: route.request().headers()
        };

        await route.fulfill({
            status: matchingMock.responseStatus || 200,
            body: getResponseBody(matchingMock),
            headers: matchingMock.responseHeaders || {}
        });
    });

    return {lastApiRequests};
}
