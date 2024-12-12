const path = require('path');
const fs = require('fs-extra');
const should = require('should');
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

            res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360.mp4`));
            res.body.media[0].thumbnail_url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360_thumb.png`));
            res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.mp4');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
            media.push(res.body.media[0].thumbnail_url.replace(config.get('url'), ''));
        });

        it('Can upload a WebM without a thumbnail', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.webm')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.webm'))
                .expect(201);

            res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360.webm`));
            should(res.body.media[0].thumbnail_url).eql(null);
            res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.webm');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
        });

        it('Can upload an Ogg', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.ogv')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.ogv'))
                .attach('thumbnail', path.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png'))
                .expect(201);

            res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360.ogv`));
            res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.ogv');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
        });

        it('Can upload an mp3', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'audio_file_123')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample.mp3'))
                .expect(201);

            res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample.mp3`));
            res.body.media[0].ref.should.equal('audio_file_123');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
        });

        it('Can upload an m4a with audio/mp4 content type', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'audio_file_mp4')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample.m4a'), {filename: 'audio-mp4.m4a', contentType: 'audio/mp4'})
                .expect(201);

            res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/audio-mp4.m4a`));
            res.body.media[0].ref.should.equal('audio_file_mp4');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
        });

        it('Can upload an m4a with audio/x-m4a content type', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'audio_file_x_m4a')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample.m4a'), {filename: 'audio-x-m4a.m4a', contentType: 'audio/x-m4a'})
                .expect(201);

            res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/audio-x-m4a.m4a`));
            res.body.media[0].ref.should.equal('audio_file_x_m4a');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
        });

        it('Rejects non-media file type', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .attach('file', path.join(__dirname, '/../../utils/fixtures/images/favicon_16x_single.ico'))
                .attach('thumbnail', path.join(__dirname, '/../../utils/fixtures/images/ghost-logo.png'))
                .expect(415);

            res.body.errors[0].message.should.match(/select a valid media file/gi);
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

            res.body.errors[0].message.should.match(/The request could not be understood./gi);
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

            res.body.errors[0].message.should.match(/The request could not be understood./gi);
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

            res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.mp4');

            media.push(res.body.media[0].url.replace(config.get('url'), ''));
            media.push(res.body.media[0].thumbnail_url.replace(config.get('url'), ''));

            const thumbnailRes = await request.put(localUtils.API.getApiQuery(`media/thumbnail/upload`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('url', res.body.media[0].url)
                .field('ref', 'updated_thumbnail')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/images/ghosticon.jpg'))
                .expect(200);

            const thumbnailUrl = res.body.media[0].url.replace('.mp4', '_thumb.jpg');
            thumbnailRes.body.media[0].url.should.equal(thumbnailUrl);
            thumbnailRes.body.media[0].ref.should.equal('updated_thumbnail');
            media.push(thumbnailRes.body.media[0].url.replace(config.get('url'), ''));
        });

        it('Can create new thumbnail based on parent media URL without existing thumbnail', async function () {
            const res = await request.post(localUtils.API.getApiQuery('media/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('ref', 'https://ghost.org/sample_640x360.mp4')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.mp4'))
                .expect(201);

            media.push(res.body.media[0].url.replace(config.get('url'), ''));

            const thumbnailRes = await request.put(localUtils.API.getApiQuery(`media/thumbnail/upload`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('url', res.body.media[0].url)
                .field('ref', 'updated_thumbnail_2')
                .attach('file', path.join(__dirname, '/../../utils/fixtures/images/ghosticon.jpg'))
                .expect(200);

            const thumbnailUrl = res.body.media[0].url.replace('.mp4', '_thumb.jpg');
            thumbnailRes.body.media[0].url.should.equal(thumbnailUrl);
            thumbnailRes.body.media[0].ref.should.equal('updated_thumbnail_2');

            media.push(thumbnailRes.body.media[0].url.replace(config.get('url'), ''));
        });
    });
});
