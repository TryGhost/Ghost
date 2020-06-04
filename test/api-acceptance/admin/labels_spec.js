const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('../../regression/api/canary/admin/utils');
const config = require('../../../core/shared/config');

const ghost = testUtils.startGhost;

let request;

describe('Labels API', function () {
    after(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    it('Can add', function () {
        const label = {
            name: 'test'
        };

        return request
            .post(localUtils.API.getApiQuery(`labels/`))
            .send({labels: [label]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.labels);

                jsonResponse.labels.should.have.length(1);
                jsonResponse.labels[0].name.should.equal(label.name);
                jsonResponse.labels[0].slug.should.equal(label.name);
            });
    });
});
