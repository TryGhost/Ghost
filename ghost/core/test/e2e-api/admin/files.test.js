const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const supertest = require('supertest');
const sinon = require('sinon');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const storage = require('../../../core/server/adapters/storage');

describe('Files API', function () {
    const files = [];
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    after(function () {
        files.forEach(function (file) {
            fs.removeSync(config.get('paths').appRoot + file);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can upload a file', async function () {
        const res = await request.post(localUtils.API.getApiQuery('files/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .field('ref', '934203942')
            .attach('file', path.join(__dirname, '/../../utils/fixtures/images/loadingcat_square.gif'))
            .expect(201);

        assert.match(new URL(res.body.files[0].url).pathname, /\/content\/files\/\d+\/\d+\/loadingcat_square\.gif/);
        assert.equal(res.body.files[0].ref, '934203942');

        files.push(new URL(res.body.files[0].url).pathname);
    });

    it('Passes the content type to the storage adapter when uploading a PDF', async function () {
        const store = storage.getStorage('files');
        const saveSpy = sinon.spy(store, 'save');

        const res = await request.post(localUtils.API.getApiQuery('files/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('file', path.join(__dirname, '/../../utils/fixtures/files/test.pdf'))
            .expect(201);

        assert.match(new URL(res.body.files[0].url).pathname, /\/content\/files\/\d+\/\d+\/test\.pdf/);
        files.push(new URL(res.body.files[0].url).pathname);

        assert.ok(saveSpy.calledOnce, 'save() should have been called once');
        const fileArg = saveSpy.firstCall.args[0];
        assert.equal(fileArg.type, 'application/pdf', 'save() should receive the correct content type for PDF files');
    });

    it('Derives content type from file extension, ignoring client-provided MIME type', async function () {
        const store = storage.getStorage('files');
        const saveSpy = sinon.spy(store, 'save');

        const res = await request.post(localUtils.API.getApiQuery('files/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('file', path.join(__dirname, '/../../utils/fixtures/files/test.pdf'), {contentType: 'text/html'})
            .expect(201);

        assert.match(new URL(res.body.files[0].url).pathname, /\/content\/files\/\d+\/\d+\/test(-\d+)?\.pdf/);
        files.push(new URL(res.body.files[0].url).pathname);

        assert.ok(saveSpy.calledOnce, 'save() should have been called once');
        const fileArg = saveSpy.firstCall.args[0];
        assert.equal(fileArg.type, 'application/pdf', 'save() should use extension-derived type, not client-provided text/html');
    });

    it('Passes the content type to the storage adapter when uploading a JSON file', async function () {
        const store = storage.getStorage('files');
        const saveSpy = sinon.spy(store, 'save');

        const res = await request.post(localUtils.API.getApiQuery('files/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('file', path.join(__dirname, '/../../utils/fixtures/data/redirects.json'))
            .expect(201);

        assert.match(new URL(res.body.files[0].url).pathname, /\/content\/files\/\d+\/\d+\/redirects\.json/);
        files.push(new URL(res.body.files[0].url).pathname);

        assert.ok(saveSpy.calledOnce, 'save() should have been called once');
        const fileArg = saveSpy.firstCall.args[0];
        assert.equal(fileArg.type, 'application/json', 'save() should receive the correct content type for JSON files');
    });

    it('Rejects an unsupported file extension with 415', async function () {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-test-'));
        const tempFile = path.join(tmpDir, 'test.exe');
        fs.writeFileSync(tempFile, 'not a real executable');

        try {
            const res = await request.post(localUtils.API.getApiQuery('files/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .attach('file', tempFile)
                .expect(415);

            assert.ok(res.body.errors, 'Response should contain errors');
            assert.match(res.body.errors[0].message, /not supported/i);
        } finally {
            fs.removeSync(tmpDir);
        }
    });

    it('Stores non-browser-renderable files with application/octet-stream', async function () {
        const store = storage.getStorage('files');
        const saveSpy = sinon.spy(store, 'save');

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-test-'));
        const tempFile = path.join(tmpDir, 'spreadsheet.xlsx');
        fs.writeFileSync(tempFile, 'fake xlsx content');

        try {
            const res = await request.post(localUtils.API.getApiQuery('files/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .attach('file', tempFile)
                .expect(201);

            assert.match(new URL(res.body.files[0].url).pathname, /\/content\/files\/\d+\/\d+\/spreadsheet\.xlsx/);
            files.push(new URL(res.body.files[0].url).pathname);

            assert.ok(saveSpy.calledOnce, 'save() should have been called once');
            const fileArg = saveSpy.firstCall.args[0];
            assert.equal(fileArg.type, 'application/octet-stream', 'Non-browser-renderable files should be stored as application/octet-stream');
        } finally {
            fs.removeSync(tmpDir);
        }
    });

    it('Stores HTML files with text/plain content type to prevent execution', async function () {
        const store = storage.getStorage('files');
        const saveSpy = sinon.spy(store, 'save');

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-test-'));
        const tempFile = path.join(tmpDir, 'page.html');
        fs.writeFileSync(tempFile, '<html><body><script>alert("xss")</script></body></html>');

        try {
            const res = await request.post(localUtils.API.getApiQuery('files/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .attach('file', tempFile)
                .expect(201);

            assert.match(new URL(res.body.files[0].url).pathname, /\/content\/files\/\d+\/\d+\/page\.html/);
            files.push(new URL(res.body.files[0].url).pathname);

            assert.ok(saveSpy.calledOnce, 'save() should have been called once');
            const fileArg = saveSpy.firstCall.args[0];
            assert.equal(fileArg.type, 'text/plain', 'HTML files should be stored as text/plain to prevent browser execution');
        } finally {
            fs.removeSync(tmpDir);
        }
    });
});
