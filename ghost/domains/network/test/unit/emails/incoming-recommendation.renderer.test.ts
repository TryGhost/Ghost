import sinon from 'sinon';
import type { Site } from '#support/site';
import assert from 'assert/strict';
import { IncomingRecommendationEmailRenderer } from '../../../emails/incoming-recommendation.renderer';

describe('IncomingRecommendationEmailRenderer', function () {
  it('passes all calls', async function () {
    const service = new IncomingRecommendationEmailRenderer({
      staffService: {
        api: {
          emails: {
            renderHTML: async () => 'html',
            renderText: async () => 'text',
          },
        },
      },
    });
    assert.equal(
      await service.renderSubject({
        title: 'title',
        siteTitle: 'title',
      } as any),
      '👍 New recommendation: title',
    );

    assert.equal(await service.renderHTML({} as any, {} as any), 'html');
    assert.equal(await service.renderText({} as any, {} as any), 'text');
  });

  describe('built for a site', function () {
    // Loaded with require, as the builder loads it, so both see one copy.
    const staffRoot = require('../../../../../core/server/services/staff').default;

    afterEach(function () {
      sinon.restore();
    });

    it('renders through the staff service, read when an email is rendered', async function () {
      const {
        incomingRecommendationEmailRenderer,
      }: typeof import('../../../emails/incoming-recommendation.renderer') = require('../../../emails/incoming-recommendation.renderer');
      const renderHTML = sinon.stub().resolves('<p>html</p>');
      const renderText = sinon.stub().resolves('text');
      const renderer = incomingRecommendationEmailRenderer({ log: {} } as Site);
      // Staff is not ready when the renderer is built, only by the time it is used.
      sinon.stub(staffRoot, 'service').get(() => ({ emails: { renderHTML, renderText } }));
      const recommendation = { title: 'Other site' } as Parameters<typeof renderer.renderHTML>[0];
      const recipient = { email: 'owner@example.com' };

      assert.equal(await renderer.renderHTML(recommendation, recipient), '<p>html</p>');
      assert.equal(await renderer.renderText(recommendation, recipient), 'text');

      sinon.assert.calledOnceWithExactly(renderHTML, 'recommendation-received', {
        recommendation,
        recipient,
      });
    });
  });
});
