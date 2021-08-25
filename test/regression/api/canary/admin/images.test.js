const path = require('path');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../../../utils');
const config = require('../../../../../core/shared/config');

const ghost = testUtils.startGhost;

describe('Images API', function () {
    const images = [];
    let request;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    after(function () {
        images.forEach(function (image) {
            fs.removeSync(config.get('paths').appRoot + image);
        });
    });

    it('Can\'t import fail without file', function () {
        return request
            .post(localUtils.API.getApiQuery('images/upload'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(422);
    });

    it('Can\'t import with unsupported file', function (done) {
        request.post(localUtils.API.getApiQuery('images/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('file', path.join(__dirname, '/../../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('Can\'t upload incorrect extension', function (done) {
        request.post(localUtils.API.getApiQuery('images/upload'))
            .set('Origin', config.get('url'))
            .set('content-type', 'image/png')
            .expect('Content-Type', /json/)
            .attach('file', path.join(__dirname, '/../../../../utils/fixtures/images/ghost-logo.pngx'))
            .expect(415)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('Can\'t import if profile image is not square', function (done) {
        request.post(localUtils.API.getApiQuery('images/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .field('purpose', 'profile_image')
            .attach('file', path.join(__dirname, '/../../../../utils/fixtures/images/favicon_not_square.png'))
            .expect(422)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('Correctly uploads multiple images with the same name in short period of time', async function () {
        const favicon = fs.readFileSync(path.join(__dirname, '/../../../../utils/fixtures/images/favicon.png'));

        const expectedImageNames = new Array(100)
            .fill(null)
            .map((_, i) => `image${i === 0 ? '' : `-${i}`}.png`);
        const firstImageName = expectedImageNames[0];

        const imageUploadRequests = new Array(100)
            .fill(favicon)
            .map(image => request.post(localUtils.API.getApiQuery('images/upload'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .field('purpose', 'image')
                .attach('file', image, {filename: firstImageName})
                .expect(201)
            );

        const imageUploadResponses = await Promise.all(imageUploadRequests);
        const uploadedImageNames = imageUploadResponses
            .flatMap(response => response.body.images.map(image => image.url.split('/').slice(-1)[0]));

        uploadedImageNames.slice().sort().should.eql(expectedImageNames.slice().sort());
    });
});
