const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const {parseYaml} = require('../../../core/server/services/custom-redirects/redirect-config-parser');

describe('Redirects API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost({
            redirectsFile: true
        });
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('download', function () {
        return request
            .get(localUtils.API.getApiQuery('redirects/download/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /yaml/)
            .expect('Content-Disposition', 'Attachment; filename="redirects.yaml"')
            .expect(200)
            .expect((res) => {
                // Sort before compare — YAML grouping reorders 301s and 302s
                // relative to the JSON fixture, which isn't load-bearing.
                const redirects = parseYaml(res.text);
                const sorted = [...redirects].sort((a, b) => a.from.localeCompare(b.from));

                assert.deepEqual(sorted, [
                    {from: '/^\\/case-insensitive/i', to: '/redirected-insensitive', permanent: false},
                    {from: '/external-url', to: 'https://ghost.org', permanent: false},
                    {from: '/external-url/(.*)', to: 'https://ghost.org/$1', permanent: false},
                    {from: '/my-old-blog-post/', to: '/revamped-url/', permanent: true},
                    {from: '/test-params', to: '/result?q=abc', permanent: true},
                    {from: '^/(?:capture1|capture2)/([A-Za-z0-9\\-]+)', to: '/$1', permanent: false},
                    {from: '^/post/[0-9]+/([a-z0-9\\-]+)', to: '/$1', permanent: false},
                    {from: '^/prefix/([a-z0-9\\-]+)?', to: '/blog/$1', permanent: false},
                    {from: '^/resources\\/download(\\/?)$', to: '/shubal-stearns', permanent: false},
                    {from: '^\\/[0-9]{4}\\/[0-9]{2}\\/([a-z0-9\\-]+)(\\.html)?(\\/)?$', to: '/$1', permanent: false},
                    {from: '^\\/Case-Sensitive', to: '/redirected-sensitive', permanent: false},
                    {from: '^\\/Default-Sensitive', to: '/redirected-default', permanent: false},
                    {from: '^\\/search\\/label\\/([^\\%20]+)$', to: '/tag/$1', permanent: false},
                    {from: '^\\/topic\\/', to: '/', permanent: false},
                    {from: '^\\/what(\\/?)$', to: '/what-does-god-say', permanent: false}
                ]);
            });
    });

    it('upload (json)', function () {
        // Provide a redirects file in the root directory of the content test folder
        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-init.json'), JSON.stringify([{
            from: 'k',
            to: 'l'
        }]));

        return request
            .post(localUtils.API.getApiQuery('redirects/upload/'))
            .set('Origin', config.get('url'))
            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-init.json'))
            .expect('Content-Type', /application\/json/)
            .expect(200)
            .expect((res) => {
                assert.deepEqual(res.body, {});
            });
    });

    it('upload (yaml)', async function () {
        const filePath = path.join(config.get('paths:contentPath'), 'redirects-init.yaml');
        fs.writeFileSync(filePath, '301:\n  /yaml-from/: /yaml-to/\n');

        await request
            .post(localUtils.API.getApiQuery('redirects/upload/'))
            .set('Origin', config.get('url'))
            .attach('redirects', filePath)
            .expect('Content-Type', /application\/json/)
            .expect(200)
            .expect((res) => {
                assert.deepEqual(res.body, {});
            });

        // Round-trip via download — status + body alone wouldn't
        // distinguish a successful upload from a silent no-op.
        await request
            .get(localUtils.API.getApiQuery('redirects/download/'))
            .set('Origin', config.get('url'))
            .expect(200)
            .expect((res) => {
                const redirects = parseYaml(res.text);
                assert.ok(
                    redirects.some(r => r.from === '/yaml-from/' && r.to === '/yaml-to/' && r.permanent === true),
                    `expected the just-uploaded yaml entry to round-trip via download: ${res.text}`
                );
            });
    });
});
