const path = require('path');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');

describe('Media API', function () {
    // NOTE: holds paths to media that need to be cleaned up after the tests are run
    const media = [];
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    after(function () {
        media.forEach(function (image) {
            fs.removeSync(config.get('paths').appRoot + image);
        });
    });

    it('Can upload a MP4', async function () {
        const res = await request.post(localUtils.API.getApiQuery('media/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .field('purpose', 'video')
            .field('ref', 'https://ghost.org/sample_640x360.mp4')
            .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.mp4'))
            .expect(201);

        res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360.mp4`));
        res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.mp4');

        media.push(res.body.media[0].url.replace(config.get('url'), ''));
    });

    it('Can upload a WebM', async function () {
        const res = await request.post(localUtils.API.getApiQuery('media/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .field('purpose', 'video')
            .field('ref', 'https://ghost.org/sample_640x360.webm')
            .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.webm'))
            .expect(201);

        res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360.webm`));
        res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.webm');

        media.push(res.body.media[0].url.replace(config.get('url'), ''));
    });

    it('Can upload an Ogg', async function () {
        const res = await request.post(localUtils.API.getApiQuery('media/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .field('purpose', 'video')
            .field('ref', 'https://ghost.org/sample_640x360.ogv')
            .attach('file', path.join(__dirname, '/../../utils/fixtures/media/sample_640x360.ogv'))
            .expect(201);

        res.body.media[0].url.should.match(new RegExp(`${config.get('url')}/content/media/\\d+/\\d+/sample_640x360.ogv`));
        res.body.media[0].ref.should.equal('https://ghost.org/sample_640x360.ogv');

        media.push(res.body.media[0].url.replace(config.get('url'), ''));
    });

    it('Rejects non-media file type', async function () {
        const res = await request.post(localUtils.API.getApiQuery('media/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('file', path.join(__dirname, '/../../utils/fixtures/images/favicon_16x_single.ico'))
            .expect(415);

        res.body.errors[0].message.should.match(/select a valid media file/gi);
    });
});
