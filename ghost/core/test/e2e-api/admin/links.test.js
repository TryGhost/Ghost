const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');
const { anyContentVersion, anyObjectId, anyString, anyEtag, anyNumber } = matchers;
const { mockSystemTime } = require('../../utils/clock-utils');
const assert = require('node:assert/strict');
const config = require('../../../core/shared/config');

const matchLink = {
  post_id: anyObjectId,
  link: {
    link_id: anyObjectId,
    from: anyString,
    to: anyString,
    edited: false,
  },
  count: {
    clicks: anyNumber,
  },
};

describe('Links API', function () {
  let agent;
  let clock;

  beforeEach(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts', 'links');
    await agent.loginAsOwner();
    clock = mockSystemTime(new Date());
  });

  afterEach(async function () {
    clock.restore();
  });

  it('Can browse all links', async function () {
    await agent
      .get('links')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        links: new Array(3).fill(matchLink),
      });
  });

  it('Can bulk update multiple links with same site redirect', async function () {
    const req = await agent.get('links');
    const siteLink = req.body.links.find((link) => {
      return link.link.to.includes('/email/');
    });
    const postId = siteLink.post_id;
    const originalTo = siteLink.link.to;
    const filter = `post_id:'${postId}'+to:'${originalTo}'`;

    // Wait minimum 2 seconds
    clock.tick(2 * 1000);

    await agent
      .put(`links/bulk/?filter=${encodeURIComponent(filter)}`)
      .body({
        bulk: {
          action: 'updateLink',
          meta: {
            link: {
              to: `${config.get('url')}/blog/emails/test?example=1`,
            },
          },
        },
      })
      .expectStatus(200)
      .matchBodySnapshot({
        bulk: {
          action: 'updateLink',
          meta: {
            stats: {
              successful: 2,
              unsuccessful: 0,
            },
            errors: [],
            unsuccessfulData: [],
          },
        },
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
    await agent
      .get('links')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        links: [
          matchLink,
          {
            ...matchLink,
            link: {
              ...matchLink.link,
              to: `${config.get('url')}/blog/emails/test?example=1&ref=Test-newsletter&attribution_type=post&attribution_id=618ba1ffbe2896088840a6df`,
              edited: true,
            },
          },
          {
            ...matchLink,
            link: {
              ...matchLink.link,
              to: `${config.get('url')}/blog/emails/test?example=1&ref=Test-newsletter&attribution_type=post&attribution_id=618ba1ffbe2896088840a6df`,
              edited: true,
            },
          },
        ],
      });
  });

  it('Can bulk update links with external redirect', async function () {
    const req = await agent.get('links');
    const siteLink = req.body.links.find((link) => {
      return link.link.to.includes('subscripe');
    });
    const postId = siteLink.post_id;
    const originalTo = siteLink.link.to;
    const filter = `post_id:'${postId}'+to:'${originalTo}'`;

    // Wait minimum 2 seconds
    clock.tick(2 * 1000);

    await agent
      .put(`links/bulk/?filter=${encodeURIComponent(filter)}`)
      .body({
        bulk: {
          action: 'updateLink',
          meta: {
            link: {
              to: 'https://example.com/subscribe?ref=Test-newsletter',
            },
          },
        },
      })
      .expectStatus(200)
      .matchBodySnapshot({
        bulk: {
          action: 'updateLink',
          meta: {
            stats: {
              successful: 1,
              unsuccessful: 0,
            },
            errors: [],
            unsuccessfulData: [],
          },
        },
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
    await agent
      .get('links')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        links: [
          {
            ...matchLink,
            link: {
              ...matchLink.link,
              to: 'https://example.com/subscribe?ref=Test-newsletter',
              edited: true,
            },
          },
          matchLink,
          matchLink,
        ],
      });
  });

  // A single quote is legal in a URL path and survives `new URL()`
  // normalisation. Unescaped it terminates the NQL string literal, the
  // filter fails to parse, and the edit silently no-ops - which made a link
  // containing one impossible to correct once sent.
  it('Can bulk update a link whose current url contains a quote', async function () {
    const req = await agent.get('links');
    const siteLink = req.body.links.find((link) => {
      return link.link.to.includes('subscripe');
    });
    const postId = siteLink.post_id;
    const quotedUrl = "https://example.com/foo-bar-baz/'?ref=Test-newsletter";
    const updatedUrl = 'https://example.com/qux-quux?ref=Test-newsletter';

    clock.tick(2 * 1000);

    // point the link at a url containing a single quote ...
    await agent
      .put(
        `links/bulk/?filter=${encodeURIComponent(`post_id:'${postId}'+to:'${siteLink.link.to}'`)}`,
      )
      .body({
        bulk: { action: 'updateLink', meta: { link: { to: quotedUrl } } },
      })
      .expectStatus(200);

    const afterFirstEdit = await agent.get('links');
    const quotedLink = afterFirstEdit.body.links.find((link) => {
      return link.link.to.includes('foo-bar-baz');
    });
    assert.equal(quotedLink.link.to, quotedUrl, 'the quote is stored verbatim');

    clock.tick(2 * 1000);

    // ... and then edit it again. The filter is written out literally rather
    // than built with escapeNqlString so this pins the wire format the admin
    // is expected to send, independently of the helper that produces it - a
    // client/server escaping mismatch is exactly what this test needs to catch
    const quotedFilter = String.raw`post_id:'${postId}'+to:'https://example.com/foo-bar-baz/\'?ref=Test-newsletter'`;

    await agent
      .put(`links/bulk/?filter=${encodeURIComponent(quotedFilter)}`)
      .body({
        bulk: { action: 'updateLink', meta: { link: { to: updatedUrl } } },
      })
      .expectStatus(200)
      .matchBodySnapshot({
        bulk: {
          action: 'updateLink',
          meta: {
            stats: {
              successful: 1,
              unsuccessful: 0,
            },
            errors: [],
            unsuccessfulData: [],
          },
        },
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });

    const afterSecondEdit = await agent.get('links');
    assert.ok(
      afterSecondEdit.body.links.some((link) => link.link.to === updatedUrl),
      'the quoted link was updated',
    );
  });

  it('Can call bulk update link with 0 matches', async function () {
    const req = await agent.get('links');
    const siteLink = req.body.links.find((link) => {
      return link.link.to.includes('subscripe');
    });
    const postId = siteLink.post_id;
    const originalTo = 'https://empty.example.com';
    const filter = `post_id:'${postId}'+to:'${originalTo}'`;
    await agent
      .put(`links/bulk/?filter=${encodeURIComponent(filter)}`)
      .body({
        bulk: {
          action: 'updateLink',
          meta: {
            link: {
              to: 'https://example.com/subscribe?ref=Test-newsletter',
            },
          },
        },
      })
      .expectStatus(200)
      .matchBodySnapshot({
        bulk: {
          action: 'updateLink',
          meta: {
            stats: {
              successful: 0,
              unsuccessful: 0,
            },
            errors: [],
            unsuccessfulData: [],
          },
        },
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
    await agent
      .get('links')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        links: [
          {
            ...matchLink,
            link: {
              ...matchLink.link,
              to: 'https://example.com/subscripe?ref=Test-newsletter',
            },
          },
          matchLink,
          matchLink,
        ],
      });
  });
});
