import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';
import sinon from 'sinon';
import type { SinonStub } from 'sinon';
// @ts-expect-error This module lacks type definitions.
import ghost_foot from '../../../../core/frontend/helpers/ghost_foot';
// @ts-expect-error This module lacks type definitions.
import { settingsCache } from '../../../../core/frontend/services/proxy';

describe('{{ghost_foot}} helper', function () {
  let settingsCacheStub: SinonStub;

  afterEach(function () {
    sinon.restore();
  });

  beforeEach(function () {
    settingsCacheStub = sinon.stub(settingsCache, 'get');
  });

  it('outputs global injected code', function () {
    settingsCacheStub
      .withArgs('codeinjection_foot')
      .returns("<script>var test = 'I am a variable!'</script>");

    const rendered = ghost_foot({ data: { root: {} } });
    assertExists(rendered);
    assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
  });

  it('outputs post injected code', function () {
    settingsCacheStub
      .withArgs('codeinjection_foot')
      .returns("<script>var test = 'I am a variable!'</script>");

    const rendered = ghost_foot({
      data: {
        root: {
          post: {
            codeinjection_foot: 'post-codeinjection',
          },
        },
      },
    });
    assertExists(rendered);
    assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
    assert.match(rendered.string, /post-codeinjection/);
  });

  it('handles post injected code being null', function () {
    settingsCacheStub
      .withArgs('codeinjection_foot')
      .returns("<script>var test = 'I am a variable!'</script>");

    const rendered = ghost_foot({
      data: {
        root: {
          post: {
            codeinjection_foot: null,
          },
        },
      },
    });
    assertExists(rendered);
    assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
    assert.doesNotMatch(rendered.string, /post-codeinjection/);
  });

  it('handles post injected code being empty', function () {
    settingsCacheStub
      .withArgs('codeinjection_foot')
      .returns("<script>var test = 'I am a variable!'</script>");

    const rendered = ghost_foot({
      data: {
        root: {
          post: {
            codeinjection_foot: '',
          },
        },
      },
    });
    assertExists(rendered);
    assert.match(rendered.string, /<script>var test = 'I am a variable!'<\/script>/);
    assert.doesNotMatch(rendered.string, /post-codeinjection/);
  });

  it('handles global empty code injection', function () {
    settingsCacheStub.withArgs('codeinjection_foot').returns('');

    const rendered = ghost_foot({ data: { root: {} } });
    assertExists(rendered);
    assert.equal(rendered.string, '');
  });

  it('handles global undefined code injection', function () {
    settingsCacheStub.withArgs('codeinjection_foot').returns(undefined);

    const rendered = ghost_foot({ data: { root: {} } });
    assertExists(rendered);
    assert.equal(rendered.string, '');
  });
});
