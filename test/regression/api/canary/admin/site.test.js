const chai = require('chai');
const {expect} = require('chai');
const {any, stringMatching} = require('expect');
const chaiJestSnapshot = require('@ethanresnick/chai-jest-snapshot');
const framework = require('../../../../utils/e2e-framework');
const config = require('../../../../../core/shared/config');

chai.use(chaiJestSnapshot);

describe('Config API', function () {
    let request;

    before(async function () {
        chaiJestSnapshot.resetSnapshotRegistry();
        request = await framework.getAgent('/ghost/api/canary/admin/');
    });

    beforeEach(function () {
        chaiJestSnapshot.configureUsingMochaContext(this);
    });

    it('can retrieve config and all expected properties', async function () {
        const res = await request
            .get('site/')
            .set('Origin', config.get('url'));

        expect(res.body.site).to.matchSnapshot({
            version: stringMatching(/\d+\.\d+/)
        });
        expect(res.headers).to.matchSnapshot({
            date: any(String),
            etag: any(String)
        });
    });
});
