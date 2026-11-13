import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sinon from 'sinon';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
// @ts-expect-error This module lacks type definitions.
import handlebarsService from '../../../../../core/frontend/services/handlebars';
// @ts-expect-error This module lacks type definitions.
import { registerAsyncThemeHelper } from '../../../../../core/frontend/services/helpers/handlebars';
import { restoreHandlebarsAfterSuite } from '../../../../utils/handlebars-state';

const { hbs } = handlebarsService;

describe('registerAsyncThemeHelper', function () {
  restoreHandlebarsAfterSuite();

  let viewsDir: string;
  let renderFile: (
    filename: string,
    options: object,
    cb: (err: Error | null, html?: string) => void,
  ) => void;
  let loggingError: sinon.SinonStub;

  async function render(template: string, locals: object = {}): Promise<string> {
    const file = path.join(viewsDir, `${Math.random().toString(36).slice(2)}.hbs`);
    await fs.writeFile(file, template);

    return new Promise((resolve, reject) => {
      renderFile(file, { settings: { views: viewsDir }, cache: false, ...locals }, (err, html) => {
        if (err) {
          return reject(err);
        }
        resolve(html!);
      });
    });
  }

  beforeAll(async function () {
    viewsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'async-helper-'));
    renderFile = hbs.express4({});

    registerAsyncThemeHelper(
      'async_echo',
      async function (this: { name?: string }, ...args: unknown[]) {
        const options = args.pop() as { hash: Record<string, unknown> };
        return [this.name, ...args, options.hash.suffix].filter(Boolean).join('-');
      },
    );
    registerAsyncThemeHelper('async_nothing', async function () {
      return undefined;
    });
    registerAsyncThemeHelper(
      'async_block',
      async function (this: object, options: { fn: (ctx: object) => string }) {
        return options.fn({ value: await Promise.resolve('inner') });
      },
    );
    registerAsyncThemeHelper('async_throws', async function () {
      throw new Error('boom');
    });
    registerAsyncThemeHelper('async_throws_sync', function () {
      throw new errors.NotFoundError({ message: 'missing' });
    });
  });

  afterAll(async function () {
    await fs.rm(viewsDir, { recursive: true, force: true });
  });

  beforeEach(function () {
    loggingError = sinon.stub(logging, 'error');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('renders the resolved value with the template context and every argument', async function () {
    const html = await render('[{{async_echo "a" "b" suffix="c"}}]', { name: 'ctx' });

    assert.equal(html, '[ctx-a-b-c]');
  });

  it('renders undefined as an empty string in double and triple braces', async function () {
    const html = await render('[{{async_nothing}}][{{{async_nothing}}}]');

    assert.equal(html, '[][]');
  });

  it('renders block helpers that call options.fn after awaiting', async function () {
    const html = await render('{{#async_block}}<b>{{value}}</b>{{/async_block}}');

    assert.equal(html, '<b>inner</b>');
  });

  it('logs and renders nothing when the helper rejects, wrapping non-Ghost errors', async function () {
    const html = await render('before{{async_throws}}after');

    assert.equal(html, 'beforeafter');
    sinon.assert.calledOnce(loggingError);
    const loggedError = loggingError.firstCall.args[0];
    assert.ok(loggedError instanceof errors.IncorrectUsageError);
    assert.equal(loggedError.context, 'registerAsyncThemeHelper: async_throws');
  });

  it('logs Ghost errors as-is when the helper throws synchronously', async function () {
    const html = await render('before{{async_throws_sync}}after');

    assert.equal(html, 'beforeafter');
    sinon.assert.calledOnce(loggingError);
    assert.ok(loggingError.firstCall.args[0] instanceof errors.NotFoundError);
  });
});
