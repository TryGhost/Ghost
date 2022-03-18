const should = require('should');
const supertest = require('supertest');
const os = require('os');
const fs = require('fs-extra');
const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
const localUtils = require('./utils');

/**
 * The new test framework doesn't yet support files
 */
describe('Settings File API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    after(function () {
        return testUtils.stopGhost();
    });

    it('Can download routes.yaml', async function () {
        const res = await request.get(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/yaml')
            .expect(200)
            .expect((_res) => {
                _res.body.should.be.empty();
            });

        res.headers['content-disposition'].should.eql('Attachment; filename="routes.yaml"');
        res.headers['content-type'].should.eql('application/yaml; charset=utf-8');
        res.headers['content-length'].should.eql('138');
    });

    it('Can upload routes.yaml', async function () {
        const newRoutesYamlPath = `${os.tmpdir()}/routes.yaml`;

        await fs.writeFile(newRoutesYamlPath, 'routes:\ncollections:\ntaxonomies:\n');
        const res = await request
            .post(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Origin', config.get('url'))
            .attach('routes', newRoutesYamlPath)
            .expect('Content-Type', /application\/json/)
            .expect(200)
            .expect((_res) => {
                _res.body.should.be.empty();
            });
    });
});
