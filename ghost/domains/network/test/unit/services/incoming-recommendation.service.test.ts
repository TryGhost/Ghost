import assert from 'assert/strict';
import sinon from 'sinon';
import { createLoggingFake } from '../../../../../test/utils/logging-utils';
import { IncomingRecommendationEmailRenderer } from '../../../emails/incoming-recommendation.renderer';
import { IncomingRecommendationService } from '../../../services/incoming-recommendation.service';
import { RecommendationService } from '../../../services/recommendation.service';

describe('IncomingRecommendationService', function () {
  let service: IncomingRecommendationService;
  let refreshMentions: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;
  let send: sinon.SinonStub;
  let readRecommendationByUrl: sinon.SinonStub;
  let logging: ReturnType<typeof createLoggingFake>;

  beforeEach(function () {
    logging = createLoggingFake();
    refreshMentions = sinon.stub().resolves();
    send = sinon.stub().resolves();
    readRecommendationByUrl = sinon.stub().resolves(null);
    service = new IncomingRecommendationService({
      recommendationService: {
        readRecommendationByUrl,
      } as any as RecommendationService,
      mentionsApi: {
        refreshMentions,
        listMentions: () => Promise.resolve({ data: [] }),
      },
      emailService: {
        send,
      },
      emailRenderer: {
        renderSubject: () => Promise.resolve(''),
        renderHTML: () => Promise.resolve(''),
        renderText: () => Promise.resolve(''),
      } as any as IncomingRecommendationEmailRenderer,
      getEmailRecipients: () =>
        Promise.resolve([
          {
            email: 'example@example.com',
          },
        ]),
      logging,
    });
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    sinon.restore();
    clock.restore();
  });

  describe('refreshAll', function () {
    it('checks every incoming recommendation again, including deleted ones', async function () {
      await service.refreshAll();

      sinon.assert.calledOnceWithExactly(refreshMentions, {
        filter: `source:~$'/.well-known/recommendations.json'+deleted:[true,false]`,
        limit: 100,
      });
    });

    it('lets a failure reach whoever asked for the refresh', async function () {
      const error = new Error('test');
      refreshMentions.rejects(error);

      await assert.rejects(service.refreshAll(), (thrown) => thrown === error);
    });
  });

  describe('sendRecommendationEmail', function () {
    it('should send email', async function () {
      await service.sendRecommendationEmail({
        id: 'test',
        source: new URL('https://example.com'),
        sourceTitle: 'Example',
        sourceSiteTitle: 'Example',
        sourceAuthor: 'Example',
        sourceExcerpt: 'Example',
        sourceFavicon: new URL('https://example.com/favicon.ico'),
        sourceFeaturedImage: new URL('https://example.com/featured.png'),
      });
      sinon.assert.calledOnce(send);
    });

    it('ignores when mention not convertable to incoming recommendation', async function () {
      const error = new Error('test');
      readRecommendationByUrl.rejects(error);
      await service.sendRecommendationEmail({
        id: 'test',
        source: new URL('https://example.com'),
        sourceTitle: 'Example',
        sourceSiteTitle: 'Example',
        sourceAuthor: 'Example',
        sourceExcerpt: 'Example',
        sourceFavicon: new URL('https://example.com/favicon.ico'),
        sourceFeaturedImage: new URL('https://example.com/featured.png'),
      });
      sinon.assert.notCalled(send);
      sinon.assert.calledOnceWithExactly(
        logging.error,
        'Failed to parse mention to incoming recommendation data type',
        error,
      );
    });
  });

  describe('listIncomingRecommendations', function () {
    beforeEach(function () {
      refreshMentions = sinon.stub().resolves();
      send = sinon.stub().resolves();
      readRecommendationByUrl = sinon.stub().resolves(null);
      service = new IncomingRecommendationService({
        recommendationService: {
          readRecommendationByUrl,
        } as any as RecommendationService,
        mentionsApi: {
          refreshMentions,
          listMentions: () =>
            Promise.resolve({
              data: [
                {
                  id: 'Incoming recommendation',
                  source: new URL('https://incoming-rec.com/.well-known/recommendations.json'),
                  sourceTitle: 'Incoming recommendation title',
                  sourceSiteTitle: null,
                  sourceAuthor: null,
                  sourceExcerpt: 'Incoming recommendation excerpt',
                  sourceFavicon: new URL('https://incoming-rec.com/favicon.ico'),
                  sourceFeaturedImage: new URL('https://incoming-rec.com/image.png'),
                },
              ],
              meta: {
                pagination: {
                  page: 1,
                  limit: 5,
                  pages: 1,
                  total: 1,
                  next: null,
                  prev: null,
                },
              },
            }),
        },
        emailService: {
          send,
        },
        emailRenderer: {
          renderSubject: () => Promise.resolve(''),
          renderHTML: () => Promise.resolve(''),
          renderText: () => Promise.resolve(''),
        } as any as IncomingRecommendationEmailRenderer,
        getEmailRecipients: () =>
          Promise.resolve([
            {
              email: 'example@example.com',
            },
          ]),
        logging,
      });
    });

    it('returns a list of incoming recommendations and pagination', async function () {
      const list = await service.listIncomingRecommendations({});

      assert.equal(list.incomingRecommendations.length, 1);
      assert.equal(list.incomingRecommendations[0].id, 'Incoming recommendation');
      assert.equal(list.incomingRecommendations[0].title, 'Incoming recommendation title');
      assert.equal(list.incomingRecommendations[0].excerpt, 'Incoming recommendation excerpt');
      assert.equal(list.incomingRecommendations[0].url.toString(), 'https://incoming-rec.com/');
      assert.equal(
        list.incomingRecommendations[0].favicon?.toString(),
        'https://incoming-rec.com/favicon.ico',
      );
      assert.equal(
        list.incomingRecommendations[0].featuredImage?.toString(),
        'https://incoming-rec.com/image.png',
      );

      assert.equal(list.meta?.pagination.page, 1);
      assert.equal(list.meta?.pagination.limit, 5);
      assert.equal(list.meta?.pagination.pages, 1);
      assert.equal(list.meta?.pagination.total, 1);
      assert.equal(list.meta?.pagination.prev, null);
      assert.equal(list.meta?.pagination.next, null);
    });
  });
});
