const should = require('should');
const supertest = require('supertest');
const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
const localUtils = require('./utils');

describe('Roles API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'posts');
    });

    it('Can request all roles', async function () {
        const res = await request.get(localUtils.API.getApiQuery('roles/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const response = res.body;
        should.exist(response);
        should.exist(response.roles);
        localUtils.API.checkResponse(response, 'roles');
        response.roles.should.have.length(10);
        localUtils.API.checkResponse(response.roles[0], 'role');
        localUtils.API.checkResponse(response.roles[1], 'role');
        localUtils.API.checkResponse(response.roles[2], 'role');
        localUtils.API.checkResponse(response.roles[3], 'role');
        localUtils.API.checkResponse(response.roles[4], 'role');
        localUtils.API.checkResponse(response.roles[5], 'role');
        localUtils.API.checkResponse(response.roles[6], 'role');
        localUtils.API.checkResponse(response.roles[7], 'role');
        localUtils.API.checkResponse(response.roles[8], 'role');
        localUtils.API.checkResponse(response.roles[9], 'role');
    });

    it('Can request roles which i am able to assign to other users', async function () {
        const res = await request.get(localUtils.API.getApiQuery('roles/?permissions=assign'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const response = res.body;
        should.exist(response.roles);
        localUtils.API.checkResponse(response, 'roles');
        response.roles.should.have.length(4);
        localUtils.API.checkResponse(response.roles[0], 'role');
        localUtils.API.checkResponse(response.roles[1], 'role');
        localUtils.API.checkResponse(response.roles[2], 'role');
        localUtils.API.checkResponse(response.roles[3], 'role');
        response.roles[0].name.should.equal('Administrator');
        response.roles[1].name.should.equal('Editor');
        response.roles[2].name.should.equal('Author');
        response.roles[3].name.should.equal('Contributor');
    });
});
