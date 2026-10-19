import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import raw from '../../../../core/frontend/helpers/raw';
// @ts-expect-error This module lacks type definitions.
import { handlebars } from '../../../../core/frontend/services/theme-engine/engine';

let defaultGlobals: Record<string, unknown> | undefined;

function compile(templateString: string) {
  const template = handlebars.compile(templateString);
  template.with = (locals: Record<string, unknown> = {}, globals?: Record<string, unknown>) => {
    globals = globals || defaultGlobals;

    return template(locals, globals);
  };

  return template;
}

describe('{{raw}} helper', function () {
  beforeAll(function () {
    handlebars.registerHelper('raw', raw);
  });

  it('can correctly compile space', function () {
    assert.equal(compile('{{{{raw}}}} {{{{/raw}}}}').with({}), ' ');
  });

  it('can correctly ignore handlebars', function () {
    assert.equal(compile('{{{{raw}}}}{{test}}{{{{/raw}}}}').with({ tag: {} }), '{{test}}');
  });

  it('can correctly compile recursive', function () {
    assert.equal(
      compile('{{{{raw}}}}{{{{raw}}}}{{{{/raw}}}}{{{{/raw}}}}').with({ tag: {} }),
      '{{{{raw}}}}{{{{/raw}}}}',
    );
  });
});
