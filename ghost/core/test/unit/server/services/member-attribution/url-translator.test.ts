import assert from 'node:assert/strict';

// @ts-expect-error JavaScript module has no type declarations
import UrlTranslator from '../../../../../core/server/services/member-attribution/url-translator';

type ResourceModel = {
  id: string;
  get(property: string): string | undefined;
};
type ResourceDetails = {
  type: string;
  id: string | null;
  url: string;
};
type ModelForUrl = {
  get(property: string): string | undefined;
  toJSON(): Record<string, string>;
};
type UrlTranslatorLike = {
  getResourceDetails(item: {
    id?: string;
    path?: string;
    type?: string;
    time: number;
  }): Promise<ResourceDetails | null>;
  getUrlTitle(url: string): string;
  getTypeAndIdFromPath(path: string): Promise<{ type: string; id: string } | undefined>;
  getResourceById(id: string, type: string): Promise<ResourceModel | null>;
  getResourceUrl(
    id: string,
    type: string,
    model: ModelForUrl,
    options: { absolute: boolean },
  ): string;
  relativeToAbsolute(path: string): string;
  stripSubdirectoryFromPath(path: string): string;
};

const models = {
  Post: {
    findOne({ id }: { id: string }) {
      if (id === 'invalid') {
        return null;
      }
      return { id: 'post_id', get: () => 'Title' };
    },
  },
  User: {
    findOne({ id }: { id: string }) {
      if (id === 'invalid') {
        return null;
      }
      return { id: 'user_id', get: () => 'Title' };
    },
  },
  Tag: {
    findOne({ id }: { id: string }) {
      if (id === 'invalid') {
        return null;
      }
      return { id: 'tag_id', get: () => 'Title' };
    },
  },
};

describe('UrlTranslator', function () {
  describe('Constructor', function () {
    it("doesn't throw", function () {
      new UrlTranslator({});
    });
  });

  describe('getResourceDetails', function () {
    let translator: UrlTranslatorLike;
    beforeAll(function () {
      translator = new UrlTranslator({
        urlUtils: {
          relativeToAbsolute: (t: string) => {
            return 'https://absolute' + t;
          },
          absoluteToRelative: (t: string) => {
            return t
              .replace('https://absolute/with-subdirectory', '')
              .replace('https://absolute', '');
          },
        },
        urlService: {
          getUrlForResource: (resource: { id: string }) => {
            return '/path/' + resource.id;
          },
          resolveUrl: async (path: string) => {
            switch (path) {
              case '/path/post':
                return { type: 'posts', id: 'post' };
              case '/path/tag':
                return { type: 'tags', id: 'tag' };
              case '/path/page':
                return { type: 'pages', id: 'page' };
              case '/path/author':
                return { type: 'authors', id: 'author' };
            }
            return null;
          },
        },
        models,
      });
    });

    it('skips items without path and type', async function () {
      assert.equal(await translator.getResourceDetails({ time: 123 }), null);
    });

    it('returns posts for explicit items', async function () {
      assert.deepEqual(
        await translator.getResourceDetails({ id: 'my-post', type: 'post', time: 123 }),
        {
          type: 'post',
          id: 'my-post',
          url: '/path/my-post',
        },
      );
    });

    it('returns null if explicit resource not found', async function () {
      assert.equal(
        await translator.getResourceDetails({ id: 'invalid', type: 'post', time: 123 }),
        null,
      );
    });

    it('returns null for invalid item', async function () {
      assert.equal(await translator.getResourceDetails({ time: 123 }), null);
    });

    it('returns url type if no path not matching a resource', async function () {
      assert.deepEqual(await translator.getResourceDetails({ path: '/test', time: 123 }), {
        type: 'url',
        id: null,
        url: '/test',
      });
    });

    it('strips subdirectory for url types', async function () {
      assert.deepEqual(
        await translator.getResourceDetails({ path: '/with-subdirectory/test', time: 123 }),
        {
          type: 'url',
          id: null,
          url: '/test',
        },
      );
    });

    it('returns post type if matching resource', async function () {
      assert.deepEqual(
        await translator.getResourceDetails({ path: '/with-subdirectory/path/post', time: 123 }),
        {
          type: 'post',
          id: 'post',
          url: '/path/post',
        },
      );
    });

    it('returns page type if matching resource', async function () {
      assert.deepEqual(
        await translator.getResourceDetails({ path: '/with-subdirectory/path/page', time: 123 }),
        {
          type: 'page',
          id: 'page',
          url: '/path/page',
        },
      );
    });
  });

  describe('getUrlTitle', function () {
    let translator: UrlTranslatorLike;
    beforeAll(function () {
      translator = new UrlTranslator({});
    });

    it('returns homepage', function () {
      assert.equal(translator.getUrlTitle('/'), 'homepage');
    });

    it('returns url', function () {
      assert.equal(translator.getUrlTitle('/url'), '/url');
    });
  });

  describe('getTypeAndIdFromPath', function () {
    let translator: UrlTranslatorLike;
    beforeAll(function () {
      translator = new UrlTranslator({
        urlService: {
          resolveUrl: async (path: string) => {
            switch (path) {
              case '/post':
                return { type: 'posts', id: 'post' };
              case '/tag':
                return { type: 'tags', id: 'tag' };
              case '/page':
                return { type: 'pages', id: 'page' };
              case '/author':
                return { type: 'authors', id: 'author' };
            }
            return null;
          },
        },
      });
    });

    it('returns posts', async function () {
      assert.deepEqual(await translator.getTypeAndIdFromPath('/post'), {
        type: 'post',
        id: 'post',
      });
    });

    it('returns pages', async function () {
      assert.deepEqual(await translator.getTypeAndIdFromPath('/page'), {
        type: 'page',
        id: 'page',
      });
    });

    it('returns authors', async function () {
      assert.deepEqual(await translator.getTypeAndIdFromPath('/author'), {
        type: 'author',
        id: 'author',
      });
    });

    it('returns tags', async function () {
      assert.deepEqual(await translator.getTypeAndIdFromPath('/tag'), {
        type: 'tag',
        id: 'tag',
      });
    });

    it('returns undefined', async function () {
      assert.equal(await translator.getTypeAndIdFromPath('/other'), undefined);
    });
  });

  describe('getResourceById', function () {
    let translator: UrlTranslatorLike;
    beforeAll(function () {
      translator = new UrlTranslator({
        urlService: {
          getUrlForResource: () => '/path',
        },
        models,
      });
    });

    it('returns for post', async function () {
      const result = await translator.getResourceById('id', 'post');
      assert.ok(result);
      assert.equal(result.id, 'post_id');
    });

    it('returns for page', async function () {
      const result = await translator.getResourceById('id', 'page');
      assert.ok(result);
      assert.equal(result.id, 'post_id');
    });

    it('returns for tag', async function () {
      const result = await translator.getResourceById('id', 'tag');
      assert.ok(result);
      assert.equal(result.id, 'tag_id');
    });

    it('returns for user', async function () {
      const result = await translator.getResourceById('id', 'author');
      assert.ok(result);
      assert.equal(result.id, 'user_id');
    });

    it('returns for invalid', async function () {
      assert.equal(await translator.getResourceById('id', 'invalid'), null);
    });

    it('returns null for not found post', async function () {
      assert.equal(await translator.getResourceById('invalid', 'post'), null);
    });

    it('returns null for not found page', async function () {
      assert.equal(await translator.getResourceById('invalid', 'page'), null);
    });

    it('returns null for not found author', async function () {
      assert.equal(await translator.getResourceById('invalid', 'author'), null);
    });

    it('returns null for not found tag', async function () {
      assert.equal(await translator.getResourceById('invalid', 'tag'), null);
    });
  });

  describe('getResourceUrl', function () {
    // Lazy URL service evaluates permalink templates against resource fields
    // (slug, published_at, primary_tag, ...), so it needs the full resource
    // shape, not just `{id, type}`.
    it("passes the model's plain data (slug, etc.) to the URL service", function () {
      let captured: Record<string, string> | undefined;
      const translator = new UrlTranslator({
        urlUtils: {
          relativeToAbsolute: (t: string) => 'https://abs' + t,
        },
        urlService: {
          getUrlForResource: (resource: Record<string, string>) => {
            captured = resource;
            return '/' + resource.slug + '/';
          },
        },
        models: {},
      });

      const tag = {
        get: () => undefined,
        toJSON: () => ({ id: 'abc', slug: 'changelog', visibility: 'public' }),
      };

      const url = translator.getResourceUrl('abc', 'tag', tag, { absolute: false });

      assert.equal(url, '/changelog/');
      assert.ok(captured);
      assert.equal(captured.id, 'abc');
      assert.equal(captured.type, 'tags');
      assert.equal(captured.slug, 'changelog');
    });

    it('keeps the email-only short-circuit for sent posts', function () {
      const translator = new UrlTranslator({
        urlUtils: {
          relativeToAbsolute: (t: string) => 'https://abs' + t,
        },
        urlService: {
          getUrlForResource: () => {
            throw new Error('the URL service should not be consulted for email-only posts');
          },
        },
        models: {},
      });

      const post = {
        get(k: string) {
          return k === 'status' ? 'sent' : 'uuid-123';
        },
        toJSON: () => ({ id: 'pid', uuid: 'uuid-123', status: 'sent' }),
      };

      assert.equal(
        translator.getResourceUrl('pid', 'post', post, { absolute: false }),
        '/email/uuid-123/',
      );
    });
  });

  describe('relativeToAbsolute', function () {
    let translator: UrlTranslatorLike;
    beforeAll(function () {
      translator = new UrlTranslator({
        urlUtils: {
          relativeToAbsolute: (t: string) => {
            return 'absolute/' + t;
          },
        },
      });
    });

    it('passes relativeToAbsolute to urlUtils', async function () {
      assert.equal(translator.relativeToAbsolute('relative'), 'absolute/relative');
    });
  });

  describe('stripSubdirectoryFromPath', function () {
    let translator: UrlTranslatorLike;
    beforeAll(function () {
      translator = new UrlTranslator({
        urlUtils: {
          relativeToAbsolute: (t: string) => {
            return 'absolute' + t;
          },
          absoluteToRelative: (t: string) => {
            const prefix = 'absolute/dir/';
            if (t.startsWith(prefix)) {
              return t.substring(prefix.length - 1);
            }
            return t;
          },
        },
      });
    });

    it('passes calls to urlUtils', async function () {
      assert.equal(translator.stripSubdirectoryFromPath('/dir/relative'), '/relative');
    });
  });
});
