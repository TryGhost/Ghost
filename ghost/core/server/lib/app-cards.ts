/**
 * How Ghost shows apps' editor cards when it serves posts, emails them and puts them in RSS.
 *
 * A post stores each card as the `app` node rendered it: a snapshot template, the public
 * properties and an email version (see `renderAppNode` in kg-default-nodes). None of it shows
 * by itself. When Ghost serves the post, it checks each card against the installed apps as they
 * are now, so an uninstalled app's cards disappear and the CSP follows the current manifest,
 * without re-rendering the post.
 */
import * as cheerio from 'cheerio';
import type { CardSurface } from '@tryghost/app-contracts';
import type { InstalledCard, InstalledCards } from '../services/app-installations';

const NONE: InstalledCards = { find: () => undefined };

// The site's own body text, as Ghost knows nothing of the theme's fonts here.
const SNAPSHOT_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

let document: Document | undefined;

/** A document to build markup in. The renderer's helpers only ever create templates in it. */
function sharedDocument(): Document {
  if (!document) {
    const { JSDOM } = require('jsdom');
    document = new JSDOM('<!doctype html>').window.document as Document;
  }
  return document;
}

/** The site's own hosts, where files uploaded through Ghost are served from. */
export function siteOrigins(): string[] {
  const config = require('../../shared/config');
  const origins = new Set<string>();
  for (const key of ['url', 'urls:image', 'urls:media', 'urls:files']) {
    const value = config.get(key);
    const url = typeof value === 'string' ? URL.parse(value) : null;
    if (url) {
      origins.add(url.origin);
    }
  }
  return [...origins];
}

/** The installed apps' cards, or none when the `apps` flag is off or apps aren't set up. */
export async function readInstalledCards(): Promise<InstalledCards> {
  const labs = require('../../shared/labs');
  if (!labs.isSet('apps')) {
    return NONE;
  }
  try {
    const appInstallations = require('../services/app-installations').default;
    return await appInstallations.service.installedCards();
  } catch {
    // Not initialised, as in some tests, or the table doesn't exist: no cards render.
    return NONE;
  }
}

export function cardOrigins(surface: CardSurface) {
  const site = siteOrigins();
  return {
    imageOrigins: [...(surface.image_origins ?? []), ...site],
    mediaOrigins: [...(surface.media_origins ?? []), ...site],
  };
}

/** For email: the `appCards` render option of the `app` node. */
export async function emailAppCards() {
  const installed = await readInstalledCards();
  return {
    lookup(appId: string, card: string) {
      const found = installed.find(appId, card);
      return found ? cardOrigins(found.surface) : null;
    },
  };
}

function frameAttributes(found: InstalledCard): Record<string, string> | null {
  const frame = found.status === 'active' ? found.surface.frame : undefined;
  const url = frame ? URL.parse(frame) : null;
  if (!url) {
    return null;
  }
  return {
    'data-app-frame': url.href,
    'data-app-frame-origin': url.origin,
    'data-app-allow': (found.surface.frame_permissions ?? []).join('; '),
  };
}

/**
 * Turns the cards in a post's stored HTML into what readers get: each available card's
 * snapshot in a sandboxed frame, a live frame's address for active apps' interactive cards,
 * and the email version filtered to the origins the app declares now. Cards whose app isn't
 * installed, or no longer declares them, are taken out.
 */
export function serveAppCards(html: string, installed: InstalledCards): string {
  if (!html.includes('kg-app-card')) {
    return html;
  }
  const { renderAppCardDocument, filterAppCardOrigins } = require('@tryghost/kg-default-nodes');
  const $ = cheerio.load(html, null, false);
  const site = siteOrigins();

  $('figure.kg-app-card').each((_index, element) => {
    const figure = $(element);
    const appId = figure.attr('data-app-id') ?? '';
    const card = figure.attr('data-app-card') ?? '';
    const found = installed.find(appId, card);
    if (!found) {
      figure.remove();
      return;
    }
    const origins = cardOrigins(found.surface);

    const snapshot = figure.children('template.kg-app-card-snapshot');
    const frame = $('<iframe></iframe>')
      .addClass('kg-app-card-snapshot-frame')
      .attr('sandbox', 'allow-scripts')
      .attr('title', found.surface.label)
      .attr('height', figure.attr('data-app-height') ?? '320')
      .attr('width', '100%')
      .attr('loading', 'lazy')
      .attr('style', 'border:0;display:block;width:100%')
      .attr(
        'srcdoc',
        renderAppCardDocument({
          // The node already split its CSS into the snapshot's first style element.
          html: snapshot.html() ?? '',
          css: '',
          title: found.surface.label,
          fontFamily: SNAPSHOT_FONT,
          ...origins,
        }),
      );
    snapshot.replaceWith(frame);

    const live = frameAttributes(found);
    if (live) {
      figure.attr(live);
    } else {
      figure.children('script.kg-app-card-public').remove();
    }

    // Replaced whole: cheerio can't set a template's contents in place.
    const email = figure.children('template.kg-app-card-email');
    const filtered = filterAppCardOrigins(
      sharedDocument(),
      email.html() ?? '',
      [...origins.imageOrigins, ...origins.mediaOrigins],
      site[0] ? `${site[0]}/` : undefined,
    );
    email.replaceWith(`<template class="kg-app-card-email">${filtered}</template>`);
  });

  return $.html();
}

/** For the posts mapper: rewrites `attrs.html` in place, if it holds app cards. */
export async function forPost(attrs: { html?: string | null }): Promise<void> {
  if (!attrs.html || !attrs.html.includes('kg-app-card')) {
    return;
  }
  attrs.html = serveAppCards(attrs.html, await readInstalledCards());
}

/** Takes app cards out of HTML before Ghost makes plain text from it, for excerpts and search. */
export function withoutAppCards(html: string): string {
  if (!html.includes('kg-app-card')) {
    return html;
  }
  const $ = cheerio.load(html, null, false);
  $('figure.kg-app-card').remove();
  return $.html();
}

/**
 * Refuses a post whose Lexical holds an app card over the limits, before it reaches the
 * database. What its HTML may contain is the renderer's job, as it sanitises on every render.
 */
export function validateAppCards(lexical: unknown): void {
  if (typeof lexical !== 'string' || !lexical.includes('"type":"app"')) {
    return;
  }
  const { isValidAppCard } = require('@tryghost/kg-default-nodes');
  const errors = require('@tryghost/errors');
  let invalid = false;
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object' || invalid) {
      return;
    }
    const record = node as { type?: unknown; children?: unknown };
    if (record.type === 'app' && !isValidAppCard(record)) {
      invalid = true;
      return;
    }
    if (Array.isArray(record.children)) {
      record.children.forEach(walk);
    }
  };
  try {
    walk((JSON.parse(lexical) as { root?: unknown }).root);
  } catch {
    // Invalid JSON is reported by the render that follows.
    return;
  }
  if (invalid) {
    throw new errors.ValidationError({
      message: 'An app card in this post is too large or not valid.',
      property: 'lexical',
    });
  }
}
