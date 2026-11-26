import assert from 'node:assert/strict';
import sinon from 'sinon';

const withSite = require('../../../../../core/server/api/endpoints/utils/with-site');
const { site } = require('../../../../../bootstrap/site');

describe('withSite', function () {
  it("hands each query the site after the frame, and returns the query's result", async function () {
    const query = sinon.stub().resolves('result');
    const controller = { docName: 'example', edit: { permissions: true, query } };
    const frame = { data: {} };

    assert.equal(await withSite(controller).edit.query(frame), 'result');

    sinon.assert.calledOnceWithExactly(query, frame, site);
  });

  it('keeps everything else about the endpoint as it was', function () {
    const headers = { cacheInvalidate: false };
    const controller = { docName: 'example', edit: { headers, permissions: true, query() {} } };

    const wrapped = withSite(controller);

    assert.equal(wrapped.docName, 'example');
    assert.equal(wrapped.edit.headers, headers);
    assert.equal(wrapped.edit.permissions, true);
  });

  it('gives the API framework the same object each time, so it builds its pipeline once', function () {
    const controller = { docName: 'example', edit: { query() {} } };

    assert.equal(withSite(controller), withSite(controller));
  });
});
