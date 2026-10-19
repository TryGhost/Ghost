import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import plural from '../../../../core/frontend/helpers/plural';

describe('{{plural}} helper', function () {
  it('will show no-value string', function () {
    const expected = 'No Posts';

    const rendered = plural.call({}, 0, {
      hash: {
        empty: 'No Posts',
        singular: '% Post',
        plural: '% Posts',
      },
    });

    assertExists(rendered);
    assert.equal(rendered.string, expected);
  });

  it('will show no-value string with placement', function () {
    const expected = '0 Posts';

    const rendered = plural.call({}, 0, {
      hash: {
        empty: '% Posts',
        singular: '% Post',
        plural: '% Posts',
      },
    });

    assertExists(rendered);
    assert.equal(rendered.string, expected);
  });

  it('will show singular string', function () {
    const expected = '1 Post';

    const rendered = plural.call({}, 1, {
      hash: {
        empty: 'No Posts',
        singular: '% Post',
        plural: '% Posts',
      },
    });

    assertExists(rendered);
    assert.equal(rendered.string, expected);
  });

  it('will show plural string', function () {
    const expected = '2 Posts';

    const rendered = plural.call({}, 2, {
      hash: {
        empty: 'No Posts',
        singular: '% Post',
        plural: '% Posts',
      },
    });

    assertExists(rendered);
    assert.equal(rendered.string, expected);
  });
});
