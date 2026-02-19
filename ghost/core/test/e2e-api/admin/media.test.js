const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const supertest = require('supertest');
const sinon = require('sinon');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const logging = require('@tryghost/logging');

describe('Media API', function () {
    // NOTE: holds paths to media that need to be cleaned up after the tests are run
    const media = [];
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    after(function () {
        media.forEach(function (image) {
            fs.removeSync(config.get('paths').appRoot + image);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('media/upload', function () {
        it('Can upload a MP4', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.mp4')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.mp4'))
                .attach('thumbnail', path.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png'))
                .expect(201);

            assert.match(new URL(res.body.media[0].url).pathname, /\/content\/media\/\d+\/\d+\/sample_640x360\.mp4/);
            assert.match(new URL(res.body.media[0].thumbnail_url).pathname, /\/content\/media\/\d+\/\d+\/sample_640x360_thumb\.png/);
            assert.equal(res.body.media[0].ref, 'https://ghost.org/sample_640x360.mp4');

            media.push(new URL(res.body.media[0].url).pathname);
            media.push(new URL(res.body.media[0].thumbnail_url).pathname);
        });

        it('Can upload a WebM without a thumbnail', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.webm')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.webm'))
                .expect(201);

            assert.match(new URL(res.body.media[0].url).pathname, /\/content\/media\/\d+\/\d+\/sample_640x360\.webm/);
            assert.equal(res.body.media[0].thumbnail_url, null);
            assert.equal(res.body.media[0].ref, 'https://ghost.org/sample_640x360.webm');

            media.push(new URL(res.body.media[0].url).pathname);
        });

        it('Can upload an Ogg', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.ogv')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.ogv'))
                .attach('thumbnail', path.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png'))
                .expect(201);

            assert.match(new URL(res.body.media[0].url).pathname, /\/content\/media\/\d+\/\d+\/sample_640x360\.ogv/);
            assert.equal(res.body.media[0].ref, 'https://ghost.org/sample_640x360.ogv');

            media.push(new URL(res.body.media[0].url).pathname);
        });

        it('Can upload an mp3', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'audio_file_123')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample.mp3'))
                .expect(201);

            assert.match(new URL(res.body.media[0].url).pathname, /\/content\/media\/\d+\/\d+\/sample\.mp3/);
            assert.equal(res.body.media[0].ref, 'audio_file_123');

            media.push(new URL(res.body.media[0].url).pathname);
        });

        it('Can upload an m4a with audio/mp4 content type', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'audio_file_mp4')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample.m4a'), {filename: 'audio-mp4.m4a', contentType: 'audio/mp4'})
                .expect(201);

            assert.match(new URL(res.body.media[0].url).pathname, /\/content\/media\/\d+\/\d+\/audio-mp4\.m4a/);
            assert.equal(res.body.media[0].ref, 'audio_file_mp4');

            media.push(new URL(res.body.media[0].url).pathname);
        });

        it('Can upload an m4a with audio/x-m4a content type', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'audio_file_x_m4a')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample.m4a'), {filename: 'audio-x-m4a.m4a', contentType: 'audio/x-m4a'})
                .expect(201);

            assert.match(new URL(res.body.media[0].url).pathname, /\/content\/media\/\d+\/\d+\/audio-x-m4a\.m4a/);
            assert.equal(res.body.media[0].ref, 'audio_file_x_m4a');

            media.push(new URL(res.body.media[0].url).pathname);
        });

        it('Rejects non-media file type', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .attach('file', path.join(__dirname, '/../../utils/fixtures/images/favicon_16x_single.ico'))
                .attach('thumbnail', path.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png'))
                .expect(415);

            assert.match(res.body.errors[0].message, /select a valid media file/gi);
            sinon.assert.calledOnce(loggingStub);
        });

        it('Errors when media request body is broken', async function () {
            // Manually construct a broken request body

            // Note: still using png mime type here but it doesn't matter because we're sending an invalid
            // request body anyway
            const blob = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==').then(res => res.blob());
            const brokenPayload = '--boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"example.png\"\r\nContent-Type: image/png\r\n\r\n';

            // eslint-disable-next-line no-undef
            const brokenDataBlob = await (new Blob([brokenPayload, blob.slice(0, Math.floor(blob.size / 2))], {
                type: 'multipart/form-data; boundary=boundary'
            })).text();

            sinon.stub(logging, 'error');
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Content-Type', 'multipart/form-data; boundary=boundary')
                .send(brokenDataBlob)
                .expect(400);

            assert.match(res.body.errors[0].message, /The request could not be understood./gi);
        });

        it('Errors when media request body is broken #2', async function () {
            // Manually construct a broken request body

            // Note: still using png mime type here but it doesn't matter because we're sending an invalid
            // request body anyway
            const blob = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==').then(res => res.blob());

            // Note: this differs from above test by not including the boundary at the end of the payload
            const brokenPayload = '--boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"example.png\"\r\nContent-Type: image/png\r\n';

            // eslint-disable-next-line no-undef
            const brokenDataBlob = await (new Blob([brokenPayload, blob.slice(0, Math.floor(blob.size / 2))], {
                type: 'multipart/form-data; boundary=boundary'
            })).text();

            sinon.stub(logging, 'error');
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Content-Type', 'multipart/form-data; boundary=boundary')
                .send(brokenDataBlob)
                .expect(400);

            assert.match(res.body.errors[0].message, /The request could not be understood./gi);
        });
    });

    describe('media/thumbnail/upload', function () {
        it('Can update existing thumbnail', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.mp4')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.mp4'))
                .attach('thumbnail', path.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png'))
                .expect(201);

            assert.equal(res.body.media[0].ref, 'https://ghost.org/sample_640x360.mp4');

            media.push(new URL(res.body.media[0].url).pathname);
            media.push(new URL(res.body.media[0].thumbnail_url).pathname);

            const thumbnailRes = await request.put(localUtils.API.getApiQuery(`media/thumbnail/upload`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('url', res.body.media[0].url)
                .field('ref', 'updated_thumbnail')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/images/ghosticon.jpg'))
                .expect(200);

            const thumbnailUrl = res.body.media[0].url.replace('.mp4', '_thumb.jpg');
            assert.equal(thumbnailRes.body.media[0].url, thumbnailUrl);
            assert.equal(thumbnailRes.body.media[0].ref, 'updated_thumbnail');
            media.push(new URL(thumbnailRes.body.media[0].url).pathname);
        });

        it('Can create new thumbnail based on parent media URL without existing thumbnail', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.mp4')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.mp4'))
                .expect(201);

            media.push(new URL(res.body.media[0].url).pathname);

            const thumbnailRes = await request.put(localUtils.API.getApiQuery(`media/thumbnail/upload`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('url', res.body.media[0].url)
                .field('ref', 'updated_thumbnail_2')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/images/ghosticon.jpg'))
                .expect(200);

            const thumbnailUrl = res.body.media[0].url.replace('.mp4', '_thumb.jpg');
            assert.equal(thumbnailRes.body.media[0].url, thumbnailUrl);
            assert.equal(thumbnailRes.body.media[0].ref, 'updated_thumbnail_2');

            media.push(new URL(thumbnailRes.body.media[0].url).pathname);
        });
    });
});
