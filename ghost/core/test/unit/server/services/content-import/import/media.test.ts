import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  isBlockedMediaUrl,
  MediaInliningFailure,
  PostMediaInliner,
} from '../../../../../../core/server/services/content-import/import/media';
import { isLocalMediaUrl } from '../../../../../../core/server/services/content-import/import/local-media-url';
import type { PostData } from '../../../../../../core/server/services/content-import/import/post-data';
import type { ExternalMediaImportResult } from '../../../../../../core/server/services/media-inliner/types';

const postData = (overrides: Partial<PostData> = {}): PostData => ({
  title: 'Media post',
  slug: 'media-post',
  status: 'published',
  type: 'post',
  visibility: 'public',
  tags: [],
  ...overrides,
});

function harness({
  localUrl = sinon.stub<[string], boolean>().returns(false),
}: {
  localUrl?: sinon.SinonStub<[string], boolean>;
} = {}) {
  const importUrl = sinon
    .stub<[string], Promise<ExternalMediaImportResult>>()
    .callsFake(async (sourceUrl: string) => {
      const fileName = new URL(sourceUrl.replace(/^\/\//, 'https://')).pathname.split('/').at(-1);
      return {
        status: 'stored',
        sourceUrl,
        storedUrl: `__GHOST_URL__/content/files/${fileName}`,
      };
    });
  const inliner = new PostMediaInliner({
    media: { importUrl },
    isLocalMediaUrl: localUrl,
  });

  return { inliner, importUrl, localUrl };
}

describe('PostMediaInliner', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('describes a single failed media file', function () {
    const error = new MediaInliningFailure([
      { sourceUrl: 'https://assets.test/image.jpg', reason: 'Download failed.' },
    ]);

    assert.equal(error.message, 'Could not import 1 media file.');
  });

  it('inlines direct post image fields and every supported Lexical media card field', async function () {
    const h = harness();
    const lexical = {
      root: {
        children: [
          { type: 'image', src: 'https://assets.test/image.jpg', href: 'https://example.com/' },
          {
            type: 'gallery',
            images: [
              { src: 'https://assets.test/gallery-one.jpg' },
              { src: 'https://assets.test/gallery-two.jpg' },
            ],
          },
          {
            type: 'audio',
            src: 'https://assets.test/audio.mp3',
            thumbnailSrc: 'https://assets.test/audio-cover.jpg',
          },
          {
            type: 'video',
            src: 'https://assets.test/video.mp4',
            thumbnailSrc: 'https://assets.test/video-cover.jpg',
            customThumbnailSrc: 'https://assets.test/video-custom.jpg',
          },
          { type: 'file', src: 'https://assets.test/guide.pdf' },
          {
            type: 'product',
            productImageSrc: 'https://assets.test/product.jpg',
            productUrl: 'https://example.com/product',
          },
          {
            type: 'header',
            backgroundImageSrc: 'https://assets.test/header.jpg',
            buttonUrl: 'https://example.com/header-button',
          },
          { type: 'signup', backgroundImageSrc: 'https://assets.test/signup.jpg' },
          {
            type: 'call-to-action',
            imageUrl: 'https://assets.test/cta.jpg',
            buttonUrl: 'https://example.com/cta-button',
          },
          {
            type: 'bookmark',
            url: 'https://example.com/bookmark',
            metadata: {
              icon: 'https://assets.test/bookmark-icon.ico',
              thumbnail: 'https://assets.test/bookmark.jpg',
            },
          },
          {
            type: 'embed',
            url: 'https://example.com/embed',
            metadata: { thumbnail_url: 'https://assets.test/embed.jpg' },
          },
          {
            type: 'before-after',
            beforeImage: { src: 'https://assets.test/before.jpg' },
            afterImage: { src: 'https://assets.test/after.jpg' },
          },
          {
            type: 'paragraph',
            children: [{ type: 'image', src: 'https://assets.test/nested.jpg' }],
          },
        ],
      },
    };
    const data = postData({
      feature_image: 'https://assets.test/feature.jpg',
      posts_meta: {
        og_image: 'https://assets.test/og.jpg',
        twitter_image: 'https://assets.test/twitter.jpg',
      },
      lexical: JSON.stringify(lexical),
      canonical_url: 'https://example.com/canonical',
      codeinjection_head: '<script src="https://assets.test/script.js"></script>',
    });

    await h.inliner.inline(data);

    assert.equal(data.feature_image, '__GHOST_URL__/content/files/feature.jpg');
    assert.equal(data.posts_meta?.og_image, '__GHOST_URL__/content/files/og.jpg');
    assert.equal(data.posts_meta?.twitter_image, '__GHOST_URL__/content/files/twitter.jpg');
    const result = JSON.parse(data.lexical ?? '{}');
    const children = result.root.children;
    assert.equal(children[0].src, '__GHOST_URL__/content/files/image.jpg');
    assert.equal(children[0].href, 'https://example.com/');
    assert.deepEqual(
      children[1].images.map((image: { src: string }) => image.src),
      [
        '__GHOST_URL__/content/files/gallery-one.jpg',
        '__GHOST_URL__/content/files/gallery-two.jpg',
      ],
    );
    assert.equal(children[2].src, '__GHOST_URL__/content/files/audio.mp3');
    assert.equal(children[2].thumbnailSrc, '__GHOST_URL__/content/files/audio-cover.jpg');
    assert.equal(children[3].src, '__GHOST_URL__/content/files/video.mp4');
    assert.equal(children[3].thumbnailSrc, '__GHOST_URL__/content/files/video-cover.jpg');
    assert.equal(children[3].customThumbnailSrc, '__GHOST_URL__/content/files/video-custom.jpg');
    assert.equal(children[4].src, '__GHOST_URL__/content/files/guide.pdf');
    assert.equal(children[5].productImageSrc, '__GHOST_URL__/content/files/product.jpg');
    assert.equal(children[5].productUrl, 'https://example.com/product');
    assert.equal(children[6].backgroundImageSrc, '__GHOST_URL__/content/files/header.jpg');
    assert.equal(children[6].buttonUrl, 'https://example.com/header-button');
    assert.equal(children[7].backgroundImageSrc, '__GHOST_URL__/content/files/signup.jpg');
    assert.equal(children[8].imageUrl, '__GHOST_URL__/content/files/cta.jpg');
    assert.equal(children[8].buttonUrl, 'https://example.com/cta-button');
    assert.equal(children[9].metadata.icon, '__GHOST_URL__/content/files/bookmark-icon.ico');
    assert.equal(children[9].metadata.thumbnail, '__GHOST_URL__/content/files/bookmark.jpg');
    assert.equal(children[9].url, 'https://example.com/bookmark');
    assert.equal(children[10].metadata.thumbnail_url, '__GHOST_URL__/content/files/embed.jpg');
    assert.equal(children[10].url, 'https://example.com/embed');
    assert.equal(children[11].beforeImage.src, '__GHOST_URL__/content/files/before.jpg');
    assert.equal(children[11].afterImage.src, '__GHOST_URL__/content/files/after.jpg');
    assert.equal(children[12].children[0].src, '__GHOST_URL__/content/files/nested.jpg');
    assert.equal(data.canonical_url, 'https://example.com/canonical');
    assert.equal(data.codeinjection_head, '<script src="https://assets.test/script.js"></script>');
    assert.equal(h.importUrl.callCount, 22);
  });

  it('inlines media attributes, srcsets, and CSS URLs inside HTML fields', async function () {
    const h = harness();
    const data = postData({
      lexical: JSON.stringify({
        root: {
          children: [
            {
              type: 'html',
              html:
                '<a href="https://example.com/keep"><img src="https://assets.test/image.jpg" data-src="https://assets.test/lazy.jpg" srcset="https://assets.test/small.jpg 1x, https://assets.test/large.jpg 2x"></a>' +
                '<video src="https://assets.test/video.mp4" poster="https://assets.test/poster.jpg"><source src="https://assets.test/video.webm"></video>' +
                '<audio src="https://assets.test/audio.mp3"></audio>' +
                '<div style="background-image: url(\'https://assets.test/background.jpg\')"></div>' +
                '<style>.hero { background: url("https://assets.test/style.jpg") }</style>',
            },
          ],
        },
      }),
    });

    await h.inliner.inline(data);

    const html = JSON.parse(data.lexical ?? '{}').root.children[0].html;
    for (const file of [
      'image.jpg',
      'lazy.jpg',
      'small.jpg',
      'large.jpg',
      'video.mp4',
      'poster.jpg',
      'video.webm',
      'audio.mp3',
      'background.jpg',
      'style.jpg',
    ]) {
      assert.match(html, new RegExp(`__GHOST_URL__/content/files/${file.replace('.', '\\.')}`));
    }
    assert.match(html, /href="https:\/\/example\.com\/keep"/);
    assert.match(html, /small\.jpg 1x, __GHOST_URL__\/content\/files\/large\.jpg 2x/);
  });

  it('inlines image syntax and embedded media in Markdown cards without changing links', async function () {
    const h = harness();
    const data = postData({
      lexical: JSON.stringify({
        root: {
          children: [
            {
              type: 'markdown',
              markdown:
                '![Photo](https://assets.test/markdown.jpg "Title")\n' +
                '![Angle](<https://assets.test/angle.jpg>)\n' +
                '[Ordinary link](https://example.com/page)\n' +
                '<img src="https://assets.test/embedded.jpg">\n' +
                '<style>.photo { background: url(https://assets.test/markdown-style.jpg) }</style>',
            },
          ],
        },
      }),
    });

    await h.inliner.inline(data);

    const markdown = JSON.parse(data.lexical ?? '{}').root.children[0].markdown;
    assert.match(markdown, /__GHOST_URL__\/content\/files\/markdown\.jpg/);
    assert.match(markdown, /__GHOST_URL__\/content\/files\/angle\.jpg/);
    assert.match(markdown, /__GHOST_URL__\/content\/files\/embedded\.jpg/);
    assert.match(markdown, /__GHOST_URL__\/content\/files\/markdown-style\.jpg/);
    assert.match(markdown, /\[Ordinary link]\(https:\/\/example\.com\/page\)/);
  });

  it('preserves local, embedded, unsupported, and non-media URLs', async function () {
    const h = harness();
    const lexical = JSON.stringify({
      root: {
        children: [
          { type: 'image', src: '__GHOST_URL__/content/images/local.jpg' },
          { type: 'image', src: '/content/images/root-relative.jpg' },
          { type: 'image', src: 'data:image/gif;base64,AAAA' },
          { type: 'image', src: 'ftp://assets.test/legacy.jpg' },
          { type: 'link', url: 'https://assets.test/ordinary-link' },
          null,
        ],
      },
    });
    const data = postData({
      feature_image: 'data:image/gif;base64,AAAA',
      posts_meta: {},
      lexical,
    });

    await h.inliner.inline(data);

    assert.equal(data.lexical, lexical);
    sinon.assert.notCalled(h.importUrl);
  });

  it('preserves media hosted on blocked domains without importing or caching it', async function () {
    const h = harness();
    const unsplashUrl = 'https://images.unsplash.com/photo-123?fit=crop&w=1200';
    const gravatarUrl = '//www.gravatar.com/avatar/abc123?s=200';
    const data = postData({
      feature_image: unsplashUrl,
      posts_meta: { og_image: gravatarUrl },
      lexical: JSON.stringify({
        root: {
          children: [
            { type: 'image', src: unsplashUrl },
            { type: 'image', src: gravatarUrl },
          ],
        },
      }),
    });

    await h.inliner.inline(data);

    assert.equal(data.feature_image, unsplashUrl);
    assert.equal(data.posts_meta?.og_image, gravatarUrl);
    assert.equal(JSON.parse(data.lexical ?? '{}').root.children[0].src, unsplashUrl);
    assert.equal(JSON.parse(data.lexical ?? '{}').root.children[1].src, gravatarUrl);
    sinon.assert.notCalled(h.importUrl);
    sinon.assert.notCalled(h.localUrl);
  });

  it('matches blocked domains without matching lookalike hostnames', function () {
    for (const sourceUrl of [
      'https://images.unsplash.com/image.jpg',
      'https://gravatar.com/avatar/abc123',
      '//www.gravatar.com/avatar/abc123',
      'https://secure.gravatar.com/avatar/abc123',
      'https://cdn.images.unsplash.com/image.jpg',
    ]) {
      assert.equal(isBlockedMediaUrl(sourceUrl), true, sourceUrl);
    }

    for (const sourceUrl of [
      'https://images.unsplash.com.evil.example/image.jpg',
      'https://notgravatar.com/avatar/abc123',
      'https://gravatar.com.evil.example/avatar/abc123',
      'not a URL',
    ]) {
      assert.equal(isBlockedMediaUrl(sourceUrl), false, sourceUrl);
    }
  });

  it('recognizes Ghost placeholders and root-relative content paths', function () {
    const options = {
      siteUrl: 'https://example.com/blog/',
      subdir: 'blog',
      assetBaseUrls: [],
    };

    for (const sourceUrl of [
      '__GHOST_URL__/content/images/image.jpg',
      '__GHOST_URL__/anything',
      '/content/images/image.jpg',
      '/content/images',
      '/content/media/video.mp4',
      '/content/files/guide.pdf',
      '/blog/content/images/image.jpg',
      '/blog/content/media/video.mp4',
      '/blog/content/files/guide.pdf',
    ]) {
      assert.equal(isLocalMediaUrl(sourceUrl, options), true, sourceUrl);
    }

    assert.equal(isLocalMediaUrl('/content/images-other/image.jpg', options), false);
    assert.equal(isLocalMediaUrl('/blogger/content/images/image.jpg', options), false);
  });

  it('recognizes current-site content URLs with configured subdirectories', function () {
    const options = {
      siteUrl: 'https://example.com/blog/',
      subdir: '/blog',
      assetBaseUrls: [],
    };

    for (const sourceUrl of [
      'http://example.com/content/images/image.jpg',
      '//example.com/blog/content/media/video.mp4',
      'https://example.com/blog/content/files/guide.pdf',
    ]) {
      assert.equal(isLocalMediaUrl(sourceUrl, options), true, sourceUrl);
    }

    for (const sourceUrl of [
      'https://example.com/about/image.jpg',
      'https://example.com/blog/content/images-other/image.jpg',
      'https://example.com.evil/content/images/image.jpg',
      'https://external.example/content/images/image.jpg',
    ]) {
      assert.equal(isLocalMediaUrl(sourceUrl, options), false, sourceUrl);
    }
  });

  it('recognizes configured storage and CDN URL prefixes without near-matching', function () {
    const options = {
      siteUrl: 'https://example.com/',
      subdir: '',
      assetBaseUrls: [
        'https://images.example/c/site/content/images/',
        'https://assets.example/c/site',
        null,
        undefined,
      ],
    };

    for (const sourceUrl of [
      'http://images.example/c/site/content/images/image.jpg',
      '//assets.example/c/site/content/media/video.mp4',
    ]) {
      assert.equal(isLocalMediaUrl(sourceUrl, options), true, sourceUrl);
    }

    for (const sourceUrl of [
      'https://images.example/c/site/content/images-other/image.jpg',
      'https://assets.example/c/site-other/content/files/guide.pdf',
      'https://assets.example.evil/c/site/content/files/guide.pdf',
      'not a URL',
    ]) {
      assert.equal(isLocalMediaUrl(sourceUrl, options), false, sourceUrl);
    }
  });

  it('does not import or cache URLs classified as local', async function () {
    const sourceUrl = 'https://example.com/content/images/existing.jpg';
    const localUrl = sinon.stub<[string], boolean>();
    localUrl.onFirstCall().returns(true);
    localUrl.onSecondCall().returns(false);
    const h = harness({ localUrl });
    const first = postData({ feature_image: sourceUrl });
    const second = postData({ feature_image: sourceUrl });

    await h.inliner.inline(first);
    await h.inliner.inline(second);

    assert.equal(first.feature_image, sourceUrl);
    assert.equal(second.feature_image, '__GHOST_URL__/content/files/existing.jpg');
    sinon.assert.calledTwice(localUrl);
    sinon.assert.calledOnceWithExactly(h.importUrl, sourceUrl);
  });

  it('processes protocol-relative media URLs', async function () {
    const h = harness();
    const data = postData({ feature_image: '//assets.test/protocol-relative.jpg' });

    await h.inliner.inline(data);

    assert.equal(data.feature_image, '__GHOST_URL__/content/files/protocol-relative.jpg');
    sinon.assert.calledWithExactly(h.importUrl, '//assets.test/protocol-relative.jpg');
  });

  it('reuses the same URL across fields in one row', async function () {
    const h = harness();
    const sourceUrl = 'https://assets.test/shared.jpg';
    const data = postData({
      feature_image: sourceUrl,
      posts_meta: { og_image: sourceUrl, twitter_image: sourceUrl },
      lexical: JSON.stringify({
        root: { children: [{ type: 'image', src: sourceUrl }] },
      }),
    });

    await h.inliner.inline(data);

    sinon.assert.calledOnceWithExactly(h.importUrl, sourceUrl);
    assert.equal(data.feature_image, '__GHOST_URL__/content/files/shared.jpg');
    assert.equal(data.posts_meta?.og_image, '__GHOST_URL__/content/files/shared.jpg');
    assert.equal(data.posts_meta?.twitter_image, '__GHOST_URL__/content/files/shared.jpg');
    assert.equal(
      JSON.parse(data.lexical ?? '{}').root.children[0].src,
      '__GHOST_URL__/content/files/shared.jpg',
    );
  });

  it('reuses the same URL in the same field across rows', async function () {
    const h = harness();
    const sourceUrl = 'https://assets.test/cross-row.jpg';
    const first = postData({ feature_image: sourceUrl });
    const second = postData({ feature_image: sourceUrl });

    await h.inliner.inline(first);
    await h.inliner.inline(second);

    sinon.assert.calledOnceWithExactly(h.importUrl, sourceUrl);
    assert.equal(first.feature_image, '__GHOST_URL__/content/files/cross-row.jpg');
    assert.equal(second.feature_image, '__GHOST_URL__/content/files/cross-row.jpg');
  });

  it('shares an in-flight import for simultaneous references', async function () {
    const h = harness();
    const sourceUrl = 'https://assets.test/simultaneous.jpg';
    let resolveImport: (result: ExternalMediaImportResult) => void = () => {};
    const pendingImport = new Promise<ExternalMediaImportResult>((resolve) => {
      resolveImport = resolve;
    });
    h.importUrl.returns(pendingImport);
    const first = postData({ feature_image: sourceUrl });
    const second = postData({ feature_image: sourceUrl });

    const firstInlining = h.inliner.inline(first);
    const secondInlining = h.inliner.inline(second);

    sinon.assert.calledOnceWithExactly(h.importUrl, sourceUrl);
    resolveImport({
      status: 'stored',
      sourceUrl,
      storedUrl: '__GHOST_URL__/content/files/simultaneous.jpg',
    });
    await Promise.all([firstInlining, secondInlining]);
    assert.equal(first.feature_image, '__GHOST_URL__/content/files/simultaneous.jpg');
    assert.equal(second.feature_image, '__GHOST_URL__/content/files/simultaneous.jpg');
  });

  it('caches failed imports while reporting them for every affected row', async function () {
    const h = harness();
    const sourceUrl = 'https://assets.test/missing.jpg';
    h.importUrl.resolves({
      status: 'failed',
      sourceUrl,
      stage: 'download',
      reason: 'The media file could not be downloaded.',
    });

    for (const title of ['First affected row', 'Second affected row']) {
      await assert.rejects(
        h.inliner.inline(postData({ title, feature_image: sourceUrl })),
        (error: unknown) => {
          assert.ok(error instanceof MediaInliningFailure);
          assert.deepEqual(error.failures, [
            { sourceUrl, reason: 'The media file could not be downloaded.' },
          ]);
          return true;
        },
      );
    }

    sinon.assert.calledOnceWithExactly(h.importUrl, sourceUrl);
  });

  it('keeps successful cached media when another URL makes the row fail', async function () {
    const h = harness();
    const storedSource = 'https://assets.test/stored-before-failure.jpg';
    const failedSource = 'https://assets.test/failure-after-storage.jpg';
    h.importUrl.callsFake(async (sourceUrl: string) => {
      if (sourceUrl === failedSource) {
        return {
          status: 'failed',
          sourceUrl,
          stage: 'storage',
          reason: 'The media file could not be stored in Ghost.',
        };
      }
      return {
        status: 'stored',
        sourceUrl,
        storedUrl: '__GHOST_URL__/content/images/stored-before-failure.jpg',
      };
    });
    const failedRow = postData({
      feature_image: storedSource,
      posts_meta: { og_image: failedSource },
    });

    await assert.rejects(h.inliner.inline(failedRow), MediaInliningFailure);
    const laterRow = postData({ feature_image: storedSource });
    await h.inliner.inline(laterRow);

    assert.equal(laterRow.feature_image, '__GHOST_URL__/content/images/stored-before-failure.jpg');
    assert.equal(h.importUrl.getCalls().filter((call) => call.args[0] === storedSource).length, 1);
  });

  it('keeps query strings and fragments in the exact cache key', async function () {
    const h = harness();
    const sourceUrls = [
      'https://assets.test/image.jpg',
      'https://assets.test/image.jpg?size=large',
      'https://assets.test/image.jpg#preview',
    ];
    const data = postData({
      feature_image: sourceUrls[0],
      posts_meta: { og_image: sourceUrls[1], twitter_image: sourceUrls[2] },
    });

    await h.inliner.inline(data);

    assert.deepEqual(
      h.importUrl.getCalls().map((call) => call.args[0]),
      sourceUrls,
    );
  });

  it('does not share cached URLs across media-inliner instances', async function () {
    const h = harness();
    const sourceUrl = 'https://assets.test/separate-imports.jpg';
    const nextImportInliner = new PostMediaInliner({
      media: { importUrl: h.importUrl },
      isLocalMediaUrl: h.localUrl,
    });

    await h.inliner.inline(postData({ feature_image: sourceUrl }));
    await nextImportInliner.inline(postData({ feature_image: sourceUrl }));

    sinon.assert.calledTwice(h.importUrl);
  });

  it('collects every unique expected download, extraction, and storage failure', async function () {
    const h = harness();
    h.importUrl.callsFake(async (sourceUrl: string) => {
      if (sourceUrl.endsWith('/download-throws.jpg') || sourceUrl.endsWith('/download-null.jpg')) {
        return {
          status: 'failed',
          sourceUrl,
          stage: 'download',
          reason: 'The media file could not be downloaded.',
        } as const;
      }
      if (sourceUrl.endsWith('/unreadable.jpg')) {
        return {
          status: 'failed',
          sourceUrl,
          stage: 'extract',
          reason: 'The downloaded media file could not be read.',
        } as const;
      }
      if (sourceUrl.endsWith('/unsupported.exe')) {
        return {
          status: 'failed',
          sourceUrl,
          stage: 'unsupported',
          reason: 'No configured storage accepts this media file.',
        } as const;
      }
      if (sourceUrl.endsWith('/store-throws.jpg')) {
        return {
          status: 'failed',
          sourceUrl,
          stage: 'storage',
          reason: 'The media file could not be stored in Ghost.',
        } as const;
      }
      return { status: 'stored', sourceUrl, storedUrl: `local:${sourceUrl}` } as const;
    });
    const data = postData({
      feature_image: 'https://assets.test/download-throws.jpg',
      posts_meta: {
        og_image: 'https://assets.test/download-null.jpg',
        twitter_image: 'https://assets.test/unreadable.jpg',
      },
      lexical: JSON.stringify({
        root: {
          children: [
            { type: 'image', src: 'https://assets.test/unsupported.exe' },
            { type: 'image', src: 'https://assets.test/store-throws.jpg' },
            { type: 'image', src: 'https://assets.test/download-null.jpg' },
          ],
        },
      }),
    });

    await assert.rejects(h.inliner.inline(data), (error: unknown) => {
      assert.ok(error instanceof MediaInliningFailure);
      assert.equal(error.message, 'Could not import 5 media files.');
      assert.deepEqual(error.failures, [
        {
          sourceUrl: 'https://assets.test/download-throws.jpg',
          reason: 'The media file could not be downloaded.',
        },
        {
          sourceUrl: 'https://assets.test/download-null.jpg',
          reason: 'The media file could not be downloaded.',
        },
        {
          sourceUrl: 'https://assets.test/unreadable.jpg',
          reason: 'The downloaded media file could not be read.',
        },
        {
          sourceUrl: 'https://assets.test/unsupported.exe',
          reason: 'No configured storage accepts this media file.',
        },
        {
          sourceUrl: 'https://assets.test/store-throws.jpg',
          reason: 'The media file could not be stored in Ghost.',
        },
      ]);
      return true;
    });
    assert.equal(h.importUrl.callCount, 5, 'every unique reference is attempted before failing');
  });

  it('propagates unexpected errors from the media importer', async function () {
    const h = harness();
    const error = new Error('media importer defect');
    h.importUrl.rejects(error);

    await assert.rejects(
      h.inliner.inline(
        postData({ feature_image: 'https://assets.test/unexpected-import-error.jpg' }),
      ),
      (thrown) => thrown === error,
    );
  });

  it('preserves valid but empty or unrelated Lexical structures', async function () {
    const h = harness();
    for (const lexical of ['null', '{}', '{"root":{}}', '{"root":{"children":[]}}']) {
      const data = postData({ lexical });
      await h.inliner.inline(data);
      assert.equal(data.lexical, lexical);
    }
    sinon.assert.notCalled(h.importUrl);
  });

  it('treats malformed Lexical JSON as an unexpected importer error', async function () {
    const h = harness();
    const data = postData({ lexical: '{not-json' });

    await assert.rejects(h.inliner.inline(data), SyntaxError);
  });

  it('preserves data-URI srcsets and empty CSS URLs', async function () {
    const h = harness();
    const data = postData({
      lexical: JSON.stringify({
        root: {
          children: [
            {
              type: 'html',
              html:
                '<img src="" srcset="" style=""><style></style>' +
                '<img srcset="data:image/svg+xml;base64,AAAA 1x, data:image/svg+xml;base64,BBBB 2x">' +
                '<source srcset=", https://assets.test/source.jpg 2x"><div style="background:url(\'\')"></div>',
            },
            { type: 'image', src: '' },
            { type: 'gallery', images: [null, {}, { src: '' }] },
            { type: 'bookmark' },
            { type: 'markdown', markdown: '' },
            { type: 42 },
          ],
        },
      }),
    });

    await h.inliner.inline(data);

    const html = JSON.parse(data.lexical ?? '{}').root.children[0].html;
    assert.match(html, /data:image\/svg\+xml;base64,AAAA 1x, data:image\/svg\+xml;base64,BBBB 2x/);
    assert.match(html, /srcset=", __GHOST_URL__\/content\/files\/source\.jpg 2x"/);
    assert.match(html, /background:url\(''\)/);
    sinon.assert.calledOnce(h.importUrl);
  });
});
