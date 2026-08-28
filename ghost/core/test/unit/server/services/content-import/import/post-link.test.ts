import assert from 'node:assert/strict';
import sinon from 'sinon';
import { urlForImportedPost } from '../../../../../../core/server/services/content-import/import/post-link';

function post(id: string, status: string, type: string) {
  return { id, toJSON: () => ({ id, status, type }) };
}

describe('content import post links', function () {
  it('uses the resolved absolute URL for a published post', function () {
    const publishedUrl = sinon.stub().returns('https://example.com/published/');
    const model = post('published-id', 'published', 'post');

    assert.equal(
      urlForImportedPost(model, {
        adminUrl: 'https://example.com/ghost/',
        publishedUrl,
      }),
      'https://example.com/published/',
    );
    sinon.assert.calledOnceWithExactly(publishedUrl, model);
  });

  it('uses the Admin post editor for a draft post', function () {
    const publishedUrl = sinon.stub();

    assert.equal(
      urlForImportedPost(post('draft-post-id', 'draft', 'post'), {
        adminUrl: 'https://example.com/blog/ghost/',
        publishedUrl,
      }),
      'https://example.com/blog/ghost/#/editor/post/draft-post-id',
    );
    sinon.assert.notCalled(publishedUrl);
  });

  it('uses the Admin page editor for a draft page', function () {
    assert.equal(
      urlForImportedPost(post('draft-page-id', 'draft', 'page'), {
        adminUrl: 'https://example.com/ghost/',
        publishedUrl: sinon.stub(),
      }),
      'https://example.com/ghost/#/editor/page/draft-page-id',
    );
  });
});
