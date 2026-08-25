import express, {type Express} from 'express';
import request from 'supertest';
// @ts-expect-error This module lacks type definitions.
import {redirectAmpUrls} from '../../../../../../core/server/web/shared/middleware/redirect-amp-urls.js';

describe('Middleware: redirectAmpUrls', function () {
    const createApp = (): Express => {
        const app = express();
        app.use(redirectAmpUrls);
        app.use((_req, res) => res.send('Hello world'));
        return app;
    };

    describe('Non-AMP URLs', function () {
        it.each(['/welcome/', '/welcome/amp-post/', '/amp-category/post/', '/', '/welcome/not-amp/'])(
            'calls next() for %s',
            async (path) => {
                await request(createApp()).get(path).expect(200, 'Hello world');
            },
        );
    });

    describe('AMP URLs', function () {
        const cases = [
            ['/welcome/amp/', '/welcome/'],
            ['/blog/post/amp/', '/blog/post/'],
            ['/amp/', '/'],
            ['/welcome/amp', '/welcome/'],
            ['/blog/post/amp', '/blog/post/'],
            ['/amp', '/'],
            ['/welcome/AMP/', '/welcome/'],
            ['/welcome/Amp', '/welcome/'],
            ['/welcome/AmP/', '/welcome/'],
            ['/qs-check/amp/?q=1', '/qs-check/?q=1'],
            ['/welcome/amp?q=1&r=2', '/welcome/?q=1&r=2'],
            ['/amp/?search=test&page=2', '/?search=test&page=2'],
            ['/welcome/amp/?q=hello%20world', '/welcome/?q=hello%20world'],
            ['/welcome%20post/amp/', '/welcome%20post/'],
            ['/blog/subdir/welcome/amp/', '/blog/subdir/welcome/'],
            ['/ghost/blog/2023/post-title/amp/?utm_source=test', '/ghost/blog/2023/post-title/?utm_source=test'],
            ['/welcome/amp/?redirect=evil.com', '/welcome/?redirect=evil.com'],
            ['/welcome//amp/', '/welcome/'],
        ] as const;

        it.each(cases)('redirects %s to %s', async (path, location) => {
                await request(createApp())
                    .get(path)
                    .expect(301)
                    .expect('Location', location);
        });
    });
});
