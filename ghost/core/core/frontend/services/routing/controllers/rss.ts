import type { Request, Response, NextFunction } from 'express';
import _ from 'lodash';
import url from 'node:url';

const debug = require('@tryghost/debug')('services:routing:controllers:rss');
const security = require('@tryghost/security');
const settingsCache = require('../../../../shared/settings-cache');
const rssService = require('../../rss');
const renderer = require('../../rendering');
const dataService = require('../../data');

export interface RSSPathOptions {
  page: number;
  slug?: string;
}

export interface RSSResponse extends Response {
  routerOptions: Record<string, unknown>;
}

export interface RelatedData {
  author?: Array<{ name: string }>;
  tag?: Array<{ name: string }>;
  [key: string]: unknown;
}

/**
 * Generates the title for the RSS feed based on author, tag, or publication settings.
 */
function getTitle(relatedData?: RelatedData): string {
  const data = relatedData || {};
  let titleStart = _.get(data, 'author[0].name') || _.get(data, 'tag[0].name') || '';

  titleStart += titleStart ? ' - ' : '';
  return titleStart + settingsCache.get('title');
}

/**
 * RSS routing controller.
 * Fetches posts/meta data and delegates rendering to `rssService`.
 */
export function rssController(req: Request, res: RSSResponse, next: NextFunction): Promise<void> {
  debug('rssController');

  const pathOptions: RSSPathOptions = {
    page: 1, // required for fetchData
    slug: req.params.slug ? security.string.safe(req.params.slug) : undefined,
  };

  // CASE: Ghost is using an rss cache - normalize the URL for use as a key
  const baseUrl = url.parse(req.originalUrl).pathname;

  return dataService
    .fetchData(pathOptions, res.routerOptions, res.locals)
    .then(function formatResult(result: { posts?: unknown[]; meta?: unknown; data?: RelatedData }) {
      const response = _.pick(result, ['posts', 'meta']) as Record<string, unknown>;

      response.title = getTitle(result.data);
      response.description = settingsCache.get('description');

      return response;
    })
    .then(function (data: Record<string, unknown>) {
      return rssService.render(res, baseUrl, data);
    })
    .catch(renderer.handleError(next));
}
