import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import routing from '../../../../core/frontend/services/routing';
// @ts-expect-error This module lacks type definitions.
import getRssUrl from '../../../../core/frontend/meta/rss-url';

describe('getRssUrl', function () {
  beforeEach(function () {
    sinon.stub(routing.registry, 'getRssUrl').returns('/rss/');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should return rss url', function () {
    const rssUrl = getRssUrl({
      secure: false,
    });

    assert.equal(rssUrl, '/rss/');
  });

  it('forwards absolute flags', function () {
    getRssUrl({}, true);

    sinon.assert.calledWith(routing.registry.getRssUrl, { absolute: true });
  });
});
