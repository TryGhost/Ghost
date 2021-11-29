const should = require('should');
const supertest = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');

describe('Redirects API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('download', function () {
        return request
            .get(localUtils.API.getApiQuery('redirects/download/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /application\/json/)
            .expect('Content-Disposition', 'Attachment; filename="redirects.json"')
            .expect(200);
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
            .expect(200);
    });
});
