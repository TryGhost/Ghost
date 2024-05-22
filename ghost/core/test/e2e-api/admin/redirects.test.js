const should = require('should');
const supertest = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');

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
            .expect('Content-Type', /application\/json/)
            .expect('Content-Disposition', 'Attachment; filename="redirects.json"')
            .expect(200)
            .expect((res) => {
                res.body.should.eql([
                    {from: '^/post/[0-9]+/([a-z0-9\\-]+)', to: '/$1'},
                    {permanent: true, from: '/my-old-blog-post/', to: '/revamped-url/'},
                    {permanent: true, from: '/test-params', to: '/result?q=abc'},
                    {from: '^\\/what(\\/?)$', to: '/what-does-god-say'},
                    {from: '^\\/search\\/label\\/([^\\%20]+)$', to: '/tag/$1'},
                    {from: '^\\/topic\\/', to: '/'},
                    {from: '^/resources\\/download(\\/?)$', to: '/shubal-stearns'},
                    {from: '^/(?:capture1|capture2)/([A-Za-z0-9\\-]+)', to: '/$1'},
                    {
                        from: '^\\/[0-9]{4}\\/[0-9]{2}\\/([a-z0-9\\-]+)(\\.html)?(\\/)?$',
                        to: '/$1'
                    },
                    {from: '^/prefix/([a-z0-9\\-]+)?', to: '/blog/$1'},
                    {from: '/^\\/case-insensitive/i', to: '/redirected-insensitive'},
                    {from: '^\\/Case-Sensitive', to: '/redirected-sensitive'},
                    {from: '^\\/Default-Sensitive', to: '/redirected-default'},
                    {from: '/external-url', to: 'https://ghost.org'},
                    {from: '/external-url/(.*)', to: 'https://ghost.org/$1'}
                ]);
            });
    });

    it('upload', function () {
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
                res.body.should.be.empty();
            });
    });
});
