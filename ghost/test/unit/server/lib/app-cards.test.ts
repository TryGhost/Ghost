const { cardsForFeed } = require('../../../../core/frontend/services/rss/app-cards-feed');
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type { InstalledCards } from '../../../../core/server/services/app-installations';
import {
  serveAppCards,
  validateAppCards,
  withoutAppCards,
} from '../../../../core/server/lib/app-cards';

/** A card as the `app` node stores it in a post's HTML (see kg-default-nodes' renderAppNode). */
function storedCard({ emailHtml }: { emailHtml?: string } = {}): string {
  const email =
    emailHtml ??
    '<p>Episode 12</p><img src="https://img.example/cover.jpg"><img src="https://track.example/t.gif"><a data-ghost-post-link="">Listen</a>';
  return (
    '<figure class="kg-card kg-app-card" data-app-id="org.ghost.cards" data-app-card="podcast" data-app-height="200">' +
    '<template class="kg-app-card-snapshot"><style>.title{font-weight:700}</style><p class="title">Episode 12</p><img src="https://img.example/cover.jpg"></template>' +
    '<script type="application/json" class="kg-app-card-public">{"episode":"Episode 12"}</script>' +
    `<template class="kg-app-card-email">${email}</template>` +
    '</figure>'
  );
}

function installed(
  status: 'active' | 'suspended',
  surface: Record<string, unknown> = {},
): InstalledCards {
  return {
    find: (appId, card) =>
      appId === 'org.ghost.cards' && card === 'podcast'
        ? {
            appId,
            status,
            surface: {
              type: 'card',
              name: 'podcast',
              label: 'Podcast',
              render: 'https://cards.example/editor/render.js',
              frame: 'https://cards.example/frames/podcast.html',
              image_origins: ['https://img.example'],
              frame_permissions: ['autoplay'],
              ...surface,
            },
          }
        : undefined,
  };
}

describe('app cards', function () {
  it('serves an active card as a snapshot frame with its live frame stamped', function () {
    const html = serveAppCards(`<p>Intro</p>${storedCard()}`, installed('active'));
    const page = new JSDOM(html).window.document;
    const figure = page.querySelector('figure.kg-app-card')!;
    const frame = figure.querySelector('iframe.kg-app-card-snapshot-frame')!;

    assert.equal(frame.getAttribute('sandbox'), 'allow-scripts');
    const srcdoc = frame.getAttribute('srcdoc')!;
    assert.match(srcdoc, /img-src data: https:\/\/img\.example/);
    assert.match(srcdoc, /Episode 12/);
    assert.equal(figure.querySelector('template.kg-app-card-snapshot'), null);

    assert.equal(
      figure.getAttribute('data-app-frame'),
      'https://cards.example/frames/podcast.html',
    );
    assert.equal(figure.getAttribute('data-app-frame-origin'), 'https://cards.example');
    assert.equal(figure.getAttribute('data-app-allow'), 'autoplay');
    assert.deepEqual(JSON.parse(figure.querySelector('script.kg-app-card-public')!.textContent!), {
      episode: 'Episode 12',
    });

    const email = figure.querySelector('template.kg-app-card-email')!.innerHTML;
    assert.match(email, /img\.example/);
    assert.doesNotMatch(email, /track\.example/);
  });

  it('serves a suspended app’s card as its snapshot only', function () {
    const html = serveAppCards(storedCard(), installed('suspended'));
    const figure = new JSDOM(html).window.document.querySelector('figure.kg-app-card')!;
    assert.ok(figure.querySelector('iframe.kg-app-card-snapshot-frame'));
    assert.equal(figure.getAttribute('data-app-frame'), null);
    assert.equal(figure.querySelector('script.kg-app-card-public'), null);
  });

  it('takes out cards whose app is not installed', function () {
    const none: InstalledCards = { find: () => undefined };
    const html = serveAppCards(`<p>Intro</p>${storedCard()}<p>Outro</p>`, none);
    assert.equal(html, '<p>Intro</p><p>Outro</p>');
  });

  it('turns served cards into their email version for RSS, links resolved', function () {
    const served = serveAppCards(storedCard(), installed('active'));
    const feed = cardsForFeed(served, 'https://site.example/episode-12/');
    assert.doesNotMatch(feed, /iframe/);
    assert.match(feed, /<p>Episode 12<\/p>/);
    assert.match(feed, /href="https:\/\/site\.example\/episode-12\/"/);
  });

  it('links to the post in RSS when a card has no email version', function () {
    const served = serveAppCards(storedCard({ emailHtml: '' }), installed('active'));
    const feed = cardsForFeed(served, 'https://site.example/episode-12/');
    assert.match(feed, /<a href="https:\/\/site\.example\/episode-12\/">View this on the web<\/a>/);
  });

  it('leaves cards out of the text Ghost makes plain text from', function () {
    assert.equal(withoutAppCards(`<p>Intro</p>${storedCard()}`), '<p>Intro</p>');
  });

  it('refuses a card over the limits before saving', function () {
    const lexical = (card: Record<string, unknown>) =>
      JSON.stringify({ root: { type: 'root', children: [{ type: 'app', ...card }] } });
    const valid = {
      appId: 'org.ghost.cards',
      card: 'podcast',
      properties: {},
      publicProperties: [],
      html: '<p>x</p>',
      css: '',
      height: 100,
      emailHtml: '',
    };
    assert.doesNotThrow(() => validateAppCards(lexical(valid)));
    assert.throws(() => validateAppCards(lexical({ ...valid, appId: 'Not An Id' })), {
      name: 'ValidationError',
    });
    assert.throws(() => validateAppCards(lexical({ ...valid, html: 'x'.repeat(1_000_001) })), {
      name: 'ValidationError',
    });
    // However the JSON is spelled.
    const spaced = JSON.stringify(
      JSON.parse(lexical({ ...valid, appId: 'Not An Id' })),
      null,
      2,
    ).replace('"type": "app"', '"type": "\\u0061pp"');
    assert.throws(() => validateAppCards(spaced), { name: 'ValidationError' });
  });

  it('never stamps a live frame served from the site’s own host', function () {
    const served = serveAppCards(storedCard(), installed('active'));
    const config = require('../../../../core/shared/config');
    const site = new URL(config.get('url')).origin;
    const onSite = serveAppCards(
      storedCard(),
      installed('active', { frame: `${site}/frames/podcast.html` }),
    );
    assert.ok(served.includes('data-app-frame='));
    assert.ok(!onSite.includes('data-app-frame='));
  });

  it('doesn’t cache a read of installed cards that started before they changed', async function () {
    const {
      CardSurfaces,
    } = require('../../../../core/server/services/app-installations/card-surfaces');
    let release!: (rows: unknown[]) => void;
    let reads = 0;
    const surfaces = new CardSurfaces(() => {
      reads += 1;
      return reads === 1
        ? new Promise((resolve) => {
            release = resolve;
          })
        : Promise.resolve([]);
    });
    const stale = surfaces.read();
    surfaces.forget();
    release([
      {
        app_id: 'org.ghost.cards',
        status: 'active',
        manifest: {
          surfaces: [{ type: 'card', name: 'podcast', label: 'P', render: 'https://x/r.js' }],
        },
      },
    ]);
    await stale;
    const fresh = await surfaces.read();
    assert.equal(reads, 2);
    assert.equal(fresh.find('org.ghost.cards', 'podcast'), undefined);
  });
});
