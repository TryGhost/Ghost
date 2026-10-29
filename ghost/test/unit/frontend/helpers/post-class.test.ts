import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import post_class from '../../../../core/frontend/helpers/post_class';

describe('{{post_class}} helper', function () {
  it('can render class string', function () {
    const rendered = post_class.call({});

    assertExists(rendered);
    assert.equal(rendered.string, 'post no-image');
  });

  it('can render class string without no-image class', function () {
    const rendered = post_class.call({ feature_image: 'blah' });

    assertExists(rendered);
    assert.equal(rendered.string, 'post');
  });

  it('can render featured class', function () {
    const post = { featured: true };
    const rendered = post_class.call(post);

    assertExists(rendered);
    assert.equal(rendered.string, 'post featured no-image');
  });

  it('can render featured class without no-image class', function () {
    const post = { featured: true, feature_image: 'asdass' };
    const rendered = post_class.call(post);

    assertExists(rendered);
    assert.equal(rendered.string, 'post featured');
  });

  it('can render page class', function () {
    const post = { page: true };
    const rendered = post_class.call(post);

    assertExists(rendered);
    assert.equal(rendered.string, 'post no-image page');
  });

  it('can render page class without no-image class', function () {
    const post = { page: true, feature_image: 'asdasdas' };
    const rendered = post_class.call(post);

    assertExists(rendered);
    assert.equal(rendered.string, 'post page');
  });
});
