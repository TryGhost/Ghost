import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type { Logger, Site } from '#support/site';
import { getUnixTime } from '../../../core/kernel/clock';
import { blogIcon } from '../../../shared/transition/blog-icon';
import { externalRequest } from '../../../shared/transition/external-request';
import { settingsCache } from '../../../shared/transition/settings-cache';
import { urlUtils } from '../../../shared/transition/url-utils';
import { getResourceUrl } from '../../publishing/actions/get-resource-url.action';

const messages = {
  requestFailedError:
    'The {service} service was unable to send a ping request, your site will continue to function.',
  requestFailedHelp: 'If you get this error repeatedly, please seek help on {url}.',
};

const defaultPostSlugs = [
  'welcome',
  'the-editor',
  'using-tags',
  'managing-users',
  'private-sites',
  'advanced-markdown',
  'themes',
];

type SettingsCache = {
  get(key: string): unknown;
};

type UrlService = {
  getUrlForResource(
    resource: Record<string, unknown>,
    options: { absolute: boolean },
  ): string | null;
};

type UrlUtils = {
  urlFor(context: string, data: Record<string, unknown>, absolute: boolean): string | null;
};

type BlogIcon = {
  getIconUrl(options: { absolute: boolean }): string;
};

type RequestFn = (url: string, options: Record<string, unknown>) => Promise<unknown>;

export type SlackAuthor = {
  name?: string;
  profile_image?: string;
  [key: string]: unknown;
};

/** A post to announce, or a plain `message` to send as it is. */
export type SlackPingPayload = {
  id?: string;
  slug?: string;
  type?: string;
  html?: string | null;
  title?: string | null;
  custom_excerpt?: string | null;
  feature_image?: string | null;
  authors?: SlackAuthor[];
  message?: string;
  [key: string]: unknown;
};

export type SlackPingDeps = {
  blogIcon: BlogIcon;
  logging: Logger;
  request: RequestFn;
  settingsCache: SettingsCache;
  urlService: UrlService;
  urlUtils: UrlUtils;
};

/**
 * @TODO: change this function to check for the properties we depend on
 */
function hasPostProperties(data: Record<string, unknown>): boolean {
  return Object.hasOwn(data, 'html') && Object.hasOwn(data, 'title') && Object.hasOwn(data, 'slug');
}

/** Posts to the Slack webhook the publisher has set. Shared by this domain's listeners. */
export class SlackPing {
  blogIcon: BlogIcon;
  logging: Logger;
  request: RequestFn;
  settingsCache: SettingsCache;
  urlService: UrlService;
  urlUtils: UrlUtils;

  constructor({ blogIcon, logging, request, settingsCache, urlService, urlUtils }: SlackPingDeps) {
    this.blogIcon = blogIcon;
    this.logging = logging;
    this.request = request;
    this.settingsCache = settingsCache;
    this.urlService = urlService;
    this.urlUtils = urlUtils;
  }

  getSlackSettings(): { username: string | undefined; url: string | undefined } {
    const username = this.settingsCache.get('slack_username') as string | undefined;
    const url = this.settingsCache.get('slack_url') as string | undefined;

    return {
      username,
      url,
    };
  }

  /** Sends the ping, unless Slack is not set up or the post is one that is never announced. */
  ping(post: SlackPingPayload): Promise<unknown> | undefined {
    let message: string | null | undefined;
    let title: string | null = null;
    let author: SlackAuthor | null = null;
    let description: string | null | undefined;
    let slackData: Record<string, unknown> = {};
    const slackSettings = this.getSlackSettings();
    const blogTitle = this.settingsCache.get('title');

    // If this is a post, we want to send the link of the post
    if (hasPostProperties(post)) {
      message = this.urlService.getUrlForResource({ ...post, type: 'posts' }, { absolute: true });
      title = post.title ? post.title : null;
      author = post.authors ? post.authors[0] : null;

      if (post.custom_excerpt) {
        description = post.custom_excerpt;
      } else if (post.html) {
        const membersContentIdx = post.html.indexOf('<!--members-only-->');
        const substringEnd = membersContentIdx > -1 ? membersContentIdx : post.html.length;

        // Remove members-only content
        let plaintext = post.html.substring(0, substringEnd);

        // Strip out HTML to a fixed point: a single replace pass can
        // leave a tag reconstructed from nested input, so repeat until
        // nothing changes
        let previous;
        do {
          previous = plaintext;
          plaintext = plaintext.replace(/<[^>]+>/g, '');
        } while (plaintext !== previous);

        description = `${plaintext
          // Split into sentences
          .split('.')
          // Remove empty strings
          .filter((sentence) => sentence.trim() !== '')
          // Get the first three sentences
          .slice(0, 3)
          // Join 'em back together
          .join('.')}.`;
      } else {
        description = null;
      }
    } else {
      message = post.message;
    }

    // Quit here if slack integration is not activated
    if (slackSettings && slackSettings.url && slackSettings.url !== '') {
      const username = slackSettings.username ? slackSettings.username : 'Ghost';
      // Only ping when not a page
      if (post.type === 'page') {
        return;
      }

      // Don't ping for the default posts, which are inserted during
      // Ghost's first run before services are initialised.
      if (post.slug && defaultPostSlugs.indexOf(post.slug) > -1) {
        return;
      }

      if (hasPostProperties(post)) {
        slackData = {
          // We are handling the case of test notification here by checking
          // if it is a post or a test message to check webhook working.
          text: `Notification from *${blogTitle}* :ghost:`,
          unfurl_links: true,
          icon_url: this.blogIcon.getIconUrl({ absolute: true }),
          username,
          // We don't want to send attachment if it is a test notification.
          attachments: [
            {
              fallback: 'Sorry, content cannot be shown.',
              title: title,
              title_link: message,
              author_name: blogTitle,
              image_url: post
                ? this.urlUtils.urlFor('image', { image: post.feature_image }, true)
                : null,
              color: '#008952',
              fields: [
                {
                  title: 'Description',
                  value: description,
                  short: false,
                },
              ],
            },
            {
              fallback: 'Sorry, content cannot be shown.',
              color: '#008952',
              thumb_url: author
                ? this.urlUtils.urlFor('image', { image: author.profile_image }, true)
                : null,
              fields: [
                {
                  title: 'Author',
                  value: author
                    ? `<${this.urlService.getUrlForResource({ ...author, type: 'authors' }, { absolute: true })} | ${author.name}>`
                    : null,
                  short: true,
                },
              ],
              footer: blogTitle,
              footer_icon: this.blogIcon.getIconUrl({ absolute: true }),
              ts: getUnixTime(),
            },
          ],
        };
      } else {
        slackData = {
          text: message,
          unfurl_links: true,
          icon_url: this.blogIcon.getIconUrl({ absolute: true }),
          username,
        };
      }

      return this.request(slackSettings.url, {
        method: 'POST',
        body: JSON.stringify(slackData),
        headers: {
          'Content-type': 'application/json',
        },
      }).catch((err: Error) => {
        this.logging.error(
          new errors.InternalServerError({
            err: err,
            context: tpl(messages.requestFailedError, { service: 'slack' }),
            help: tpl(messages.requestFailedHelp, { url: 'https://docs.ghost.org/' }),
          }),
        );
      });
    }
  }
}

/** The Slack ping for a site, made from that site's settings, addresses and icon. */
export const slackPing = (site: Site) =>
  new SlackPing({
    blogIcon: blogIcon(site),
    logging: site.log,
    request: externalRequest(site),
    settingsCache: settingsCache(site),
    urlService: {
      getUrlForResource: (resource, options) => getResourceUrl(site, resource, options),
    },
    urlUtils: urlUtils(site),
  });
