import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import moment from 'moment';

import {messages, defaultPostSlugs} from './constants';

type SettingsCache = {
    get(key: string): unknown;
};

type UrlService = {
    facade: {
        getUrlForResource(resource: Record<string, unknown>, options: {absolute: boolean}): string | null;
    };
};

type UrlUtils = {
    urlFor(context: string, data: Record<string, unknown>, absolute: boolean): string | null;
};

type BlogIcon = {
    getIconUrl(options: {absolute: boolean}): string;
};

type Logging = {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
};

type RequestFn = (url: string, options: Record<string, unknown>) => Promise<unknown>;

type PostModel = {
    related(relation: string): {toJSON(): unknown[]};
    toJSON(): Record<string, unknown>;
};

type ModelEventListener = (model: PostModel, options?: {importing?: boolean}) => void;

type ModelEvents = {
    removeListener(event: 'post.published', listener: ModelEventListener): ModelEvents;
    removeListener(event: 'slack.test', listener: () => void): ModelEvents;
    on(event: 'post.published', listener: ModelEventListener): ModelEvents;
    on(event: 'slack.test', listener: () => void): ModelEvents;
};

type SlackAuthor = {
    name?: string;
    profile_image?: string;
    [key: string]: unknown;
};

type SlackPingPayload = {
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

export type SlackPingServiceDeps = {
    blogIcon: BlogIcon;
    events: ModelEvents;
    logging: Logging;
    request: RequestFn;
    settingsCache: SettingsCache;
    urlService: UrlService;
    urlUtils: UrlUtils;
};

/**
 * @TODO: change this function to check for the properties we depend on
 */
function hasPostProperties(data: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(data, 'html') && Object.prototype.hasOwnProperty.call(data, 'title') && Object.prototype.hasOwnProperty.call(data, 'slug');
}

export class SlackPingService {
    blogIcon: BlogIcon;
    events: ModelEvents;
    logging: Logging;
    request: RequestFn;
    settingsCache: SettingsCache;
    urlService: UrlService;
    urlUtils: UrlUtils;
    postListener: ModelEventListener;
    testListener: () => void;

    constructor({blogIcon, events, logging, request, settingsCache, urlService, urlUtils}: SlackPingServiceDeps) {
        this.blogIcon = blogIcon;
        this.events = events;
        this.logging = logging;
        this.request = request;
        this.settingsCache = settingsCache;
        this.urlService = urlService;
        this.urlUtils = urlUtils;

        // Stable references so removeListener() can de-register them across reboots.
        this.postListener = this.handlePostEvent.bind(this);
        this.testListener = this.handleTestEvent.bind(this);
    }

    getSlackSettings(): {username: string | undefined; url: string | undefined} {
        const username = this.settingsCache.get('slack_username') as string | undefined;
        const url = this.settingsCache.get('slack_url') as string | undefined;

        return {
            username,
            url
        };
    }

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
            message = this.urlService.facade.getUrlForResource({...post, type: 'posts'}, {absolute: true});
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

                description = `${
                    plaintext
                        // Split into sentences
                        .split('.')
                        // Remove empty strings
                        .filter(sentence => sentence.trim() !== '')
                        // Get the first three sentences
                        .slice(0, 3)
                        // Join 'em back together
                        .join('.')
                }.`;
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

            // Don't ping for the default posts.
            // This also handles the case where during Ghost's first run
            // model loading inserts this post but permissions.init() hasn't
            // (can't) run yet.
            if (post.slug && defaultPostSlugs.indexOf(post.slug) > -1) {
                return;
            }

            if (hasPostProperties(post)) {
                slackData = {
                    // We are handling the case of test notification here by checking
                    // if it is a post or a test message to check webhook working.
                    text: `Notification from *${blogTitle}* :ghost:`,
                    unfurl_links: true,
                    icon_url: this.blogIcon.getIconUrl({absolute: true}),
                    username,
                    // We don't want to send attachment if it is a test notification.
                    attachments: [
                        {
                            fallback: 'Sorry, content cannot be shown.',
                            title: title,
                            title_link: message,
                            author_name: blogTitle,
                            image_url: post ? this.urlUtils.urlFor('image', {image: post.feature_image}, true) : null,
                            color: '#008952',
                            fields: [
                                {
                                    title: 'Description',
                                    value: description,
                                    short: false
                                }
                            ]
                        },
                        {
                            fallback: 'Sorry, content cannot be shown.',
                            color: '#008952',
                            thumb_url: author ? this.urlUtils.urlFor('image', {image: author.profile_image}, true) : null,
                            fields: [
                                {
                                    title: 'Author',
                                    value: author ? `<${this.urlService.facade.getUrlForResource({...author, type: 'authors'}, {absolute: true})} | ${author.name}>` : null,
                                    short: true
                                }
                            ],
                            footer: blogTitle,
                            footer_icon: this.blogIcon.getIconUrl({absolute: true}),
                            ts: moment().unix()
                        }
                    ]
                };
            } else {
                slackData = {
                    text: message,
                    unfurl_links: true,
                    icon_url: this.blogIcon.getIconUrl({absolute: true}),
                    username
                };
            }

            return this.request(slackSettings.url, {
                body: JSON.stringify(slackData),
                headers: {
                    'Content-type': 'application/json'
                }
            }).catch((err: Error) => {
                this.logging.error(new errors.InternalServerError({
                    err: err,
                    context: tpl(messages.requestFailedError, {service: 'slack'}),
                    help: tpl(messages.requestFailedHelp, {url: 'https://ghost.org/docs/'})
                }));
            });
        }
    }

    /**
     * Event listener for post.published events
     */
    handlePostEvent(model: PostModel, options?: {importing?: boolean}): void {
        // CASE: do not ping slack if we import a database
        // TODO: refactor post.published events to never fire on importing
        if (options && options.importing) {
            return;
        }

        this.ping({
            ...model.toJSON(),
            authors: model.related('authors').toJSON() as SlackAuthor[],
            // tags are needed so the lazy URL service can evaluate collection
            // filters (e.g. `tag:foo`) when resolving the post URL; without them
            // a tag-filtered post resolves to /404/
            tags: model.related('tags').toJSON()
        });
    }

    /**
     * Event listener for the slack.test event fired by the Admin API to
     * verify the webhook configuration.
     */
    handleTestEvent(): void {
        this.ping({
            message: 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!'
        });
    }

    /**
     * Register event listeners for the Slack ping integration.
     *
     * The slack.test event comes from the API rather than a direct call,
     * which was done long ago to avoid circular dependencies.
     */
    subscribeEvents(): void {
        this.events
            .removeListener('post.published', this.postListener)
            .on('post.published', this.postListener);

        this.events
            .removeListener('slack.test', this.testListener)
            .on('slack.test', this.testListener);
    }
}
