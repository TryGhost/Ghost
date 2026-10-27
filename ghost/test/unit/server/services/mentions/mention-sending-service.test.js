const MentionSendingService = require('../../../../../core/server/services/mentions/mention-sending-service');
const assert = require('node:assert/strict');
const nock = require('nock');
// non-standard to use externalRequest here, but this is required for the overrides in the libary, which we want to test for security reasons in combination with the package
const externalRequest = require('../../../../../core/server/lib/request-external.js');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const dnsPromises = require('node:dns').promises;
const { createModel } = require('./utils/index.js');

const SendWebmentionsJob =
  require('../../../../../core/server/services/mentions/send-webmentions-job').default;

const linkHtml = '<a href="https://example.com/">link</a>';

describe('MentionSendingService', function () {
  let errorLogStub;

  beforeEach(function () {
    nock.disableNetConnect();
    sinon.stub(logging, 'info');
    errorLogStub = sinon.stub(logging, 'error');
  });

  afterEach(function () {
    nock.cleanAll();
    sinon.restore();
  });

  afterAll(function () {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('listen', function () {
    it('Called on all events we listen to', async function () {
      const service = new MentionSendingService({});
      const stub = sinon.stub(service, 'sendForPost').resolves();
      let callback;
      const events = {
        on: sinon.stub().callsFake((event, c) => {
          callback = c;
        }),
      };
      service.listen(events);
      sinon.assert.callCount(events.on, 6);
      await callback({});
      sinon.assert.calledOnce(stub);
    });
  });

  describe('sendForPost', function () {
    it('Ignores if disabled', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => false,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: 'same',
          },
        }),
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Ignores if importing data', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: 'same',
          },
        }),
        { importing: true },
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Ignores if internal context', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: 'same',
          },
        }),
        { context: { internal: true } },
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Ignores draft posts', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'draft',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: '',
          },
        }),
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Ignores if html was not changed', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml,
          previous: {
            status: 'published',
            html: linkHtml,
          },
        }),
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Ignores if html changed but its links did not', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const getPostData = sinon.stub().resolves({});
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData,
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml + '<p>More content</p>',
          previous: {
            status: 'published',
            html: linkHtml,
          },
        }),
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(getPostData);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Ignores email only posts', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'send',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: 'same',
          },
        }),
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(errorLogStub);
    });

    it('Sends on publish', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: linkHtml,
          },
        }),
      );
      sinon.assert.calledOnce(jobsService.dispatch);
      const job = jobsService.dispatch.getCall(0).args[0];
      assert.ok(job instanceof SendWebmentionsJob);
      assert.equal(job.sourceUrl, 'https://site.com/post/');
      assert.deepEqual(job.links, ['https://example.com/']);
    });

    it('Sends on unpublish', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'draft',
          html: linkHtml,
          previous: {
            status: 'published',
            html: linkHtml,
          },
        }),
      );
      sinon.assert.calledOnce(jobsService.dispatch);
      const job = jobsService.dispatch.getCall(0).args[0];
      assert.ok(job instanceof SendWebmentionsJob);
      assert.equal(job.sourceUrl, 'https://site.com/post/');
      assert.deepEqual(job.links, ['https://example.com/']);
    });

    it('Resolves the url from previous data when the post was destroyed', async function () {
      // Deleting a published post fires `unpublished` with the model
      // already destroyed: own attributes cleared, previous state kept.
      const getPostData = sinon.stub().resolves({});
      const getPostUrl = sinon.stub().returns('https://site.com/gone/');
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData,
        getPostUrl,
        jobsService,
      });

      const previous = {
        id: 'post-id',
        status: 'published',
        html: linkHtml,
        slug: 'gone',
        type: 'post',
      };
      const destroyedPost = {
        attributes: {},
        get: () => undefined,
        previous: (prop) => previous[prop],
        previousAttributes: () => previous,
        toJSON: () => ({ tags: [], authors: [] }),
      };

      await service.sendForPost(destroyedPost);

      sinon.assert.calledOnce(jobsService.dispatch);
      assert.equal(jobsService.dispatch.getCall(0).args[0].sourceUrl, 'https://site.com/gone/');
      // resolved from the destroyed model's previous data, not by loading it
      sinon.assert.notCalled(getPostData);
      assert.equal(getPostUrl.getCall(0).args[0], 'post-id');
      assert.equal(getPostUrl.getCall(0).args[1].status, 'published');
      assert.equal(getPostUrl.getCall(0).args[1].slug, 'gone');
    });

    it('Sends on html change to removed and added links', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: '<a href="https://kept.com/">kept</a><a href="https://added.com/">added</a>',
          previous: {
            status: 'published',
            html: '<a href="https://kept.com/">kept</a><a href="https://removed.com/">removed</a>',
          },
        }),
      );
      sinon.assert.calledOnce(jobsService.dispatch);
      const job = jobsService.dispatch.getCall(0).args[0];
      assert.ok(job instanceof SendWebmentionsJob);
      assert.equal(job.sourceUrl, 'https://site.com/post/');
      assert.deepEqual(job.links, ['https://removed.com/', 'https://added.com/']);
    });

    it('Queues the same payload however much html surrounds the links', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      for (const filler of ['<p>short</p>', `<p>${'a'.repeat(1000)}</p>`]) {
        await service.sendForPost(
          createModel({
            status: 'published',
            html: linkHtml + filler,
            previous: {
              status: 'published',
              html: filler,
            },
          }),
        );
      }
      sinon.assert.calledTwice(jobsService.dispatch);
      const [shortPost, longPost] = jobsService.dispatch.args.map(([job]) => JSON.stringify(job));
      assert.equal(longPost, shortPost);
    });

    it('Catches and logs errors', async function () {
      const jobsService = {
        dispatch: sinon.stub().rejects(new Error('Internal error test')),
      };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      await service.sendForPost(
        createModel({
          status: 'published',
          html: linkHtml,
          previous: {
            status: 'draft',
            html: 'same',
          },
        }),
      );
      sinon.assert.calledTwice(errorLogStub);
    });

    it('Sends no mentions for posts without html and previous html', async function () {
      const jobsService = { dispatch: sinon.stub().resolves() };
      const service = new MentionSendingService({
        isEnabled: () => true,
        getPostData: () => ({}),
        getPostUrl: () => 'https://site.com/post/',
        jobsService,
      });
      const linksStub = sinon.stub(service, 'getLinks');
      await service.sendForPost(
        createModel({
          status: 'published',
          html: '',
          previous: {
            status: 'draft',
            html: '',
          },
        }),
      );
      sinon.assert.notCalled(jobsService.dispatch);
      sinon.assert.notCalled(linksStub);
    });
  });

  describe('sendWebmentions', function () {
    it('rehydrates the source url and links', async function () {
      const service = new MentionSendingService({});
      const stub = sinon.stub(service, 'sendAll').resolves();
      const job = new SendWebmentionsJob({
        sourceUrl: 'https://site.com/post/',
        links: ['https://example.com/'],
      });

      await service.sendWebmentions(job);

      sinon.assert.calledOnce(stub);
      const { url, links } = stub.firstCall.args[0];
      assert.deepEqual(url, new URL('https://site.com/post/'));
      assert.deepEqual(links, [new URL('https://example.com/')]);
    });

    it('Sends to all links', { retry: 1 }, async function () {
      let counter = 0;
      const scope = nock('https://example.org')
        .persist()
        .post('/webmentions-test')
        .reply(() => {
          counter += 1;
          return [202];
        });

      const service = new MentionSendingService({
        externalRequest,
        getSiteUrl: () => new URL('https://site.com'),
        discoveryService: {
          getEndpoint: async () => new URL('https://example.org/webmentions-test'),
        },
      });
      await service.sendWebmentions(
        new SendWebmentionsJob({
          sourceUrl: 'https://site.com/',
          links: ['https://example.com/', 'https://example.org/#fragment', 'http://example2.org/'],
        }),
      );
      assert.equal(scope.isDone(), true);
      assert.equal(counter, 3);
    });

    it('Catches and logs errors', { retry: 1 }, async function () {
      let counter = 0;
      const scope = nock('https://example.org')
        .persist()
        .post('/webmentions-test')
        .reply(() => {
          counter += 1;
          if (counter === 2) {
            return [500];
          }
          return [202];
        });

      const service = new MentionSendingService({
        externalRequest,
        getSiteUrl: () => new URL('https://site.com'),
        discoveryService: {
          getEndpoint: async () => new URL('https://example.org/webmentions-test'),
        },
      });
      await service.sendWebmentions(
        new SendWebmentionsJob({
          sourceUrl: 'https://site.com/',
          links: ['https://example.com/', 'https://example.org/#fragment', 'http://example2.org/'],
        }),
      );
      assert.equal(scope.isDone(), true);
      assert.equal(counter, 3);
      sinon.assert.calledOnce(errorLogStub);
    });
  });

  describe('getLinks', function () {
    it('Returns all unique links in a HTML-document', async function () {
      const service = new MentionSendingService({
        getSiteUrl: () => new URL('https://site.com'),
      });
      const links = service.getLinks(`
                <html>
                    <body>
                        <a href="https://example.com">Example</a>
                        <a href="https://example.com">Example repeated</a>
                        <a href="https://example.org#fragment">Example</a>
                        <a href="http://example2.org">Example 2</a>
                    </body>
                </html>
            `);
      assert.deepEqual(
        [...links],
        ['https://example.com/', 'https://example.org/#fragment', 'http://example2.org/'],
      );
    });

    it('Does not include invalid or local URLs', async function () {
      const service = new MentionSendingService({
        getSiteUrl: () => new URL('https://site.com'),
      });
      const links = service.getLinks(`<a href="/">Example</a>`);
      assert.deepEqual([...links], []);
    });

    it('Does not include non-http protocols', async function () {
      const service = new MentionSendingService({
        getSiteUrl: () => new URL('https://site.com'),
      });
      const links = service.getLinks(`<a href="ftp://invalid.com">Example</a>`);
      assert.deepEqual([...links], []);
    });

    it('Does not include invalid urls', async function () {
      const service = new MentionSendingService({
        getSiteUrl: () => new URL('https://site.com'),
      });
      const links = service.getLinks(`<a href="()">Example</a>`);
      assert.deepEqual([...links], []);
    });

    it('Does not include urls from site domain', async function () {
      const service = new MentionSendingService({
        getSiteUrl: () => new URL('https://site.com'),
      });
      const links = service.getLinks(`<a href="http://site.com/test?123">Example</a>`);
      assert.deepEqual([...links], []);
    });

    it('Ignores invalid site urls', async function () {
      const service = new MentionSendingService({
        getSiteUrl: () => new URL('invalid()'),
      });
      const links = service.getLinks(`<a href="http://site.com/test?123">Example</a>`);
      assert.deepEqual([...links], ['http://site.com/test?123']);
    });
  });

  describe('send', function () {
    it('Can handle 202 accepted responses', { retry: 1 }, async function () {
      const source = new URL('https://example.com/source');
      const target = new URL('https://target.com/target');
      const endpoint = new URL('https://example.org/webmentions-test');
      const scope = nock('https://example.org')
        .persist()
        .post(
          '/webmentions-test',
          `source=${encodeURIComponent('https://example.com/source')}&target=${encodeURIComponent('https://target.com/target')}&source_is_ghost=true`,
        )
        .reply(202);

      const service = new MentionSendingService({ externalRequest });
      await service.send({
        source: source,
        target: target,
        endpoint: endpoint,
      });
      assert(scope.isDone());
    });

    it('Can handle 201 created responses', { retry: 1 }, async function () {
      const source = new URL('https://example.com/source');
      const target = new URL('https://target.com/target');
      const endpoint = new URL('https://example.org/webmentions-test');
      const scope = nock('https://example.org')
        .persist()
        .post(
          '/webmentions-test',
          `source=${encodeURIComponent('https://example.com/source')}&target=${encodeURIComponent('https://target.com/target')}&source_is_ghost=true`,
        )
        .reply(201);

      const service = new MentionSendingService({ externalRequest });
      await service.send({
        source: source,
        target: target,
        endpoint: endpoint,
      });
      assert(scope.isDone());
    });

    it('Can handle 400 responses', { retry: 1 }, async function () {
      const scope = nock('https://example.org').persist().post('/webmentions-test').reply(400);

      const service = new MentionSendingService({ externalRequest });
      await assert.rejects(
        service.send({
          source: new URL('https://example.com/source'),
          target: new URL('https://target.com/target'),
          endpoint: new URL('https://example.org/webmentions-test'),
        }),
        /sending failed/,
      );
      assert(scope.isDone());
    });

    it('Can handle 500 responses', { retry: 1 }, async function () {
      const scope = nock('https://example.org').persist().post('/webmentions-test').reply(500);

      const service = new MentionSendingService({ externalRequest });
      await assert.rejects(
        service.send({
          source: new URL('https://example.com/source'),
          target: new URL('https://target.com/target'),
          endpoint: new URL('https://example.org/webmentions-test'),
        }),
        /sending failed/,
      );
      assert(scope.isDone());
    });

    it('Can handle redirect responses', { retry: 1 }, async function () {
      const scope = nock('https://example.org').persist().post('/webmentions-test').reply(302, '', {
        Location: 'https://example.org/webmentions-test-2',
      });
      const scope2 = nock('https://example.org').persist().post('/webmentions-test-2').reply(201);

      const service = new MentionSendingService({ externalRequest });
      await service.send({
        source: new URL('https://example.com'),
        target: new URL('https://example.com'),
        endpoint: new URL('https://example.org/webmentions-test'),
      });
      assert(scope.isDone());
      assert(scope2.isDone());
    });

    it('Can handle network errors', { retry: 1 }, async function () {
      const scope = nock('https://example.org')
        .persist()
        .post('/webmentions-test')
        .replyWithError('network error');

      const service = new MentionSendingService({ externalRequest });
      await assert.rejects(
        service.send({
          source: new URL('https://example.com/source'),
          target: new URL('https://target.com/target'),
          endpoint: new URL('https://example.org/webmentions-test'),
        }),
        /network error/,
      );
      assert(scope.isDone());
    });

    it('Does not send to private IP behind DNS', async function () {
      // Stub DNS to return a private IP for the target domain
      dnsPromises.lookup.restore?.();
      const dnsStub = sinon.stub(dnsPromises, 'lookup').callsFake(() => {
        return Promise.resolve({ address: '127.0.0.1', family: 4 });
      });

      try {
        const service = new MentionSendingService({ externalRequest });
        await assert.rejects(
          service.send({
            source: new URL('https://example.com/source'),
            target: new URL('https://target.com/target'),
            endpoint: new URL('http://domaincontrol.com/webmentions'),
          }),
          /non-permitted private IP/,
        );
      } finally {
        dnsStub.restore();
      }
    });
  });
});
