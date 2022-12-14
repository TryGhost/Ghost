const path = require('path');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');

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

    it('Can upload a file', async function () {
        const res = await request.post(localUtils.API.getApiQuery('files/upload'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .field('ref', '934203942')
            .attach('file', path.join(__dirname, '/../../utils/fixtures/images/loadingcat_square.gif'))
            .expect(201);

        res.body.files[0].url.should.match(new RegExp(`${config.get('url')}/content/files/\\d+/\\d+/loadingcat_square.gif`));
        res.body.files[0].ref.should.equal('934203942');

        files.push(res.body.files[0].url.replace(config.get('url'), ''));
    });
});
