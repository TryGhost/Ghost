/* global expect, vi */

const fs = require('fs');
const path = require('path');
const { createBrowserEnvironment, loadScript } = require('../../../utils/browser-test-utils');

describe('comment-counts.js', function () {
  let env;
  let scriptContent;

  const countMarker = (id, className = 'comment-count') => `
        <script
            data-ghost-comment-count="${id}"
            data-ghost-comment-count-empty="No comments"
            data-ghost-comment-count-singular="comment"
            data-ghost-comment-count-plural="comments"
            data-ghost-comment-count-tag="span"
            data-ghost-comment-count-class-name="${className}"
            data-ghost-comment-count-autowrap="true"
        ></script>
    `;

  beforeAll(function () {
    scriptContent = fs.readFileSync(
      path.join(__dirname, '../../../../core/frontend/src/comment-counts/comment-counts.js'),
      'utf8',
    );
  });

  afterEach(function () {
    vi.restoreAllMocks();

    if (env) {
      env.dom.window.close();
      env = null;
    }
  });

  function setupEnvironment(
    html = `<!DOCTYPE html><html><body><article class="post-card">${countMarker('post-1')}</article></body></html>`,
  ) {
    env = createBrowserEnvironment({ html });

    env.window.fetch = vi.fn(async (url) => {
      const counts = {
        'https://example.com/members/api/comments/counts/?ids=post-1': { 'post-1': 1 },
        'https://example.com/members/api/comments/counts/?ids=post-2': { 'post-2': 2 },
        'https://example.com/members/api/comments/counts/?ids=post-1,post-2': {
          'post-1': 1,
          'post-2': 2,
        },
      };

      return {
        status: 200,
        json: async () => counts[url],
      };
    });
  }

  async function flushAsyncWork() {
    await Promise.resolve();
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }

  it('fetches and renders counts for post cards added after initial page load', async function () {
    setupEnvironment();

    loadScript(env, scriptContent, {
      dataAttributes: {
        'ghost-comments-counts-api': 'https://example.com/members/api/comments/counts/',
      },
    });

    await flushAsyncWork();
    expect(env.document.body.textContent).toMatch(/1 comment/);

    const article = env.document.createElement('article');
    article.className = 'post-card';
    article.innerHTML = countMarker('post-2');
    env.document.body.appendChild(article);

    await new Promise((resolve) => {
      env.window.setTimeout(resolve, 150);
    });
    await flushAsyncWork();

    expect(env.window.fetch).toHaveBeenCalledWith(
      'https://example.com/members/api/comments/counts/?ids=post-2',
      expect.any(Object),
    );
    expect(article.textContent).toMatch(/2 comments/);
  });

  it('renders counts when the class option contains multiple class names', async function () {
    setupEnvironment(
      `<!DOCTYPE html><html><body>` +
        `<article id="first">${countMarker('post-1', 'comment-count small')}</article>` +
        `<article id="second">${countMarker('post-2')}</article>` +
        `</body></html>`,
    );

    loadScript(env, scriptContent, {
      dataAttributes: {
        'ghost-comments-counts-api': 'https://example.com/members/api/comments/counts/',
      },
    });

    await flushAsyncWork();

    const first = env.document.querySelector('#first span');
    expect(first.textContent).toBe('1 comment');
    expect(first.className).toBe('comment-count small');
    expect(env.document.querySelector('#second span').textContent).toBe('2 comments');
  });
});
