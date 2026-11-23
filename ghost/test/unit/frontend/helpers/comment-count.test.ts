import sinon from 'sinon';

import configUtils from '../../../utils/config-utils';
import { mockManager } from '../../../utils/e2e-framework';
import { openServices } from '../../../utils/services';

// @ts-expect-error This module lacks type definitions.
import proxy from '../../../../core/frontend/services/proxy';
import type { InternalKeys } from '../../../../core/server/services/internal-keys';
import { html } from 'common-tags';
const { settingsCache } = proxy;

// Required, so that it is the root the helper reaches through its own requires, which asks the
// application the test opens.
const internalKeysRoot: typeof import('../../../../core/server/services/internal-keys').default =
  require('../../../../core/server/services/internal-keys').default;

// @ts-expect-error This module lacks type definitions.
import { registerHelper, shouldCompileToExpected } from './utils/handlebars';
import { restoreHandlebarsAfterSuite } from '../../../utils/handlebars-state';

describe('{{comment_count}} helper', function () {
  restoreHandlebarsAfterSuite();

  let internalKeys: InternalKeys;

  beforeAll(function () {
    registerHelper('comment_count');
  });

  beforeEach(function () {
    // The helper asks the internal keys service for the key. Each test builds its own.
    openServices();
    internalKeys = internalKeysRoot.service;
    internalKeys.set('ghost-internal-frontend', Promise.resolve({ id: 'k', secret: 'xyz' }));
    mockManager.mockMail();
    sinon.stub(settingsCache, 'get');
  });

  afterEach(async function () {
    mockManager.restore();
    sinon.restore();
    await configUtils.restore();
  });

  it('returns a script with the post id when autowrap is disabled', async function () {
    const templateString = `{{comment_count empty="No comments" singular="comment" plural="comments" autowrap="false"}}`;

    shouldCompileToExpected(
      templateString,
      {
        id: 'post-id',
      },
      html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty="No comments"
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
                data-ghost-comment-count-tag="script"
                data-ghost-comment-count-class-name=""
                data-ghost-comment-count-autowrap="false"
            >
            </script>
        `,
    );
  });

  it('applies all the hash params as data attributes', function () {
    const templateString = `{{comment_count empty="No comments" singular="comment" plural="comments" autowrap="div" class="custom"}}`;

    shouldCompileToExpected(
      templateString,
      {
        id: 'post-id',
      },
      html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty="No comments"
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
                data-ghost-comment-count-tag="div"
                data-ghost-comment-count-class-name="custom"
                data-ghost-comment-count-autowrap="true"
            >
            </script>
        `,
    );
  });

  it('correctly sets the defaults', async function () {
    const templateString = `{{comment_count}}`;

    shouldCompileToExpected(
      templateString,
      {
        id: 'post-id',
      },
      html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty=""
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
                data-ghost-comment-count-tag="span"
                data-ghost-comment-count-class-name=""
                data-ghost-comment-count-autowrap="true"
            >
            </script>
        `,
    );
  });
});
