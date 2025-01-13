import {ValidationError} from '@tryghost/errors';
// import type {FetcherService} from 'rettiwt-api';

type DependenciesType = {
    config?: {
        bearerToken?: string;
    },
    _fetcher: (tweetId: string) => Promise<any>; // eslint-disable-line
}

type IXEmbedProvider = {
    _dependencies:DependenciesType;
    canSupportRequest(url: URL): Promise<boolean>; // eslint-disable-line
    getOEmbedData(url: URL): Promise<OEmbedData>; // eslint-disable-line
}

// reverse engineered tweet data from https://developer.x.com/en/docs/x-api/migrate/data-formats/standard-v1-1-to-v2
type TweetData = {
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics: {
        retweet_count: number;
        like_count: number;
        reply_count?: number;
        quote_count?: number;
    };
    lang?: string;
    conversation_id?: string;
    in_reply_to_user_id?: string;
    possibly_sensitive?: boolean;
    reply_settings?: 'everyone' | 'mentioned_users' | 'followers';
    source?: string;
    withheld?: {
        country_codes?: string[];
        scope?: string;
    };
    context_annotations?: {
        domain: {
            id: string;
            name: string;
            description?: string;
        };
        entity: {
            id: string;
            name: string;
            description?: string;
        };
    }[];
    referenced_tweets?: {
        type: 'retweeted' | 'replied_to' | 'quoted';
        id: string;
        author_id?: string;
    }[];
    geo?: {
        place_id?: string;
    };
    entities?: {
        mentions?: {
            start: number;
            end: number;
            username: string;
        }[];
        urls?: {
            start: number;
            end: number;
            url: string;
            display_url?: string;
        }[];
        hashtags?: {
            start: number;
            end: number;
            tag: string;
        }[];
        annotations?: {
            start: number;
            end: number;
            probability: number;
            type: string;
            normalized_text: string;
        }[];
    };
    attachments?: {
        media_keys?: string[];
        poll_ids?: string[];
    };
    includes?: {
        media?: {
            duration_ms?: number;
            height?: number;
            media_key: string;
            preview_image_url?: string;
            url?: string;
            type?: string;
            width?: number;
            public_metrics?: {
                view_count?: number;
                like_count?: number;
                retweet_count?: number;
                reply_count?: number;
            };
            alt_text?: string;
        }[];
        places?: {
            id: string;
            full_name: string;
            contained_within?: string[];
            country: string;
            country_code: string;
            name: string;
            place_type: string;
            geo?: {
                type: string;
                bbox: number[];
                properties: object;
            };
        }[];
        polls?: {
            id: string;
            duration_minutes?: number;
            end_datetime?: string;
            options: {
                position: number;
                label: string;
                votes: number;
            }[];
            voting_status: string;
        }[];
        users?: {
            id: string;
            name: string;
            username: string;
            created_at?: string;
            description?: string;
            location?: string;
            pinned_tweet_id?: string;
            profile_image_url?: string;
            protected?: boolean;
            verified?: boolean;
            url?: string;
            withheld?: {
                country_codes?: string[];
            };
            entities?: {
                url?: {
                    urls: {
                        start: number;
                        end: number;
                        url: string;
                        expanded_url: string;
                        display_url: string;
                    }[];
                };
                description?: {
                    urls: {
                        start: number;
                        end: number;
                        url: string;
                        expanded_url: string;
                        display_url: string;
                    }[];
                };
            };
            public_metrics?: {
                followers_count?: number;
                following_count?: number;
                tweet_count?: number;
                listed_count?: number;
            };
        }[];
    };
};

type OEmbedData = {
    tweet_data: TweetData;
    type: string;
}

const TWITTER_PATH_REGEX = /\/status\/(\d+)/;

export class XEmbedProvider implements IXEmbedProvider {
    _dependencies:DependenciesType;

    constructor(dependencies:DependenciesType) {
        this._dependencies = dependencies;
    }

    async canSupportRequest(url:URL) {
        return (url.host === 'twitter.com' || url.host === 'x.com') && TWITTER_PATH_REGEX.test(url.pathname);
    }

    async getTweetId(url: URL) {
        const match = TWITTER_PATH_REGEX.exec(url.pathname);

        if (!match) {
            throw new ValidationError({
                message: 'Invalid URL'
            });
        }

        return match[1];
    }

    // since we can get v1 data without logging into twitter, we can use remap the data to v2 format
    // to ensure compatibility with our templates
    async mapTweetToTweetData(rawTweetData: any) : Promise<TweetData> {
        const tweetData: TweetData = {
            id: rawTweetData.id_str,
            text: rawTweetData.full_text || rawTweetData.text,
            created_at: rawTweetData.created_at,
            author_id: rawTweetData.user.id_str,
            public_metrics: {
                retweet_count: rawTweetData.retweet_count,
                like_count: rawTweetData.favorite_count
            },
            lang: rawTweetData.lang || 'en',
            conversation_id: rawTweetData.conversation_id,
            in_reply_to_user_id: rawTweetData.in_reply_to_user_id_str || undefined,
            possibly_sensitive: rawTweetData.possibly_sensitive || false,
            reply_settings: rawTweetData.reply_settings || 'everyone',
            source: rawTweetData.source,
            withheld: rawTweetData.withheld ? {
                country_codes: rawTweetData.withheld.country_codes
            } : undefined,
            context_annotations: rawTweetData.context_annotations?.map((annotation: any) => ({
                domain: {
                    id: annotation.domain.id,
                    name: annotation.domain.name,
                    description: annotation.domain.description
                },
                entity: {
                    id: annotation.entity.id,
                    name: annotation.entity.name,
                    description: annotation.entity.description
                }
            })) || [],
            referenced_tweets: [],
            geo: rawTweetData.geo ? {place_id: rawTweetData.geo.place_id} : undefined,
            entities: {
                mentions: rawTweetData.entities?.user_mentions?.map((mention: any) => ({
                    start: mention.indices[0],
                    end: mention.indices[1] - 1,
                    username: mention.screen_name
                })) || [],
                hashtags: rawTweetData.entities?.hashtags?.map((hashtag: any) => ({
                    start: hashtag.indices[0],
                    end: hashtag.indices[1] - 1,
                    tag: hashtag.text
                })) || [],
                urls: rawTweetData.entities?.urls?.map((url: any) => ({
                    start: url.indices[0],
                    end: url.indices[1] - 1,
                    url: url.expanded_url,
                    display_url: url.display_url
                })) || []
            },
            includes: {
                media: [],
                users: [],
                places: [],
                polls: []
            },
            attachments: {
                media_keys: [],
                poll_ids: []
            }
        };

        tweetData.attachments = tweetData.attachments || {media_keys: [], poll_ids: []};
        tweetData.includes = tweetData.includes || {media: [], users: [], places: [], polls: []};
    
        // Handling media attachments
        if (rawTweetData.extended_entities?.media) {
            // initialise attachments and includes.media
            tweetData.attachments.media_keys = rawTweetData.extended_entities.media.map(
                (media: any) => media.id_str
            );
            tweetData.includes = tweetData.includes || {media: [], users: [], places: [], polls: []};
            tweetData.includes.media = rawTweetData.extended_entities.media.map((media: any) => ({
                media_key: media.id_str,
                url: media.media_url_https,
                preview_image_url: media.media_url_https,
                type: media.type,
                height: media.sizes?.large?.h,
                width: media.sizes?.large?.w
            }));
        }
    
        // Handling referenced tweets (replies, retweets, quotes)
        tweetData.referenced_tweets = [];
        if (rawTweetData.in_reply_to_status_id_str) {
            tweetData.referenced_tweets.push({
                type: 'replied_to',
                id: rawTweetData.in_reply_to_status_id_str
            });
        }
        if (rawTweetData.retweeted_status) {
            tweetData.referenced_tweets.push({
                type: 'retweeted',
                id: rawTweetData.retweeted_status.id_str,
                author_id: rawTweetData.retweeted_status.user.id_str
            });
        }
        if (rawTweetData.quoted_status_id_str) {
            tweetData.referenced_tweets.push({
                type: 'quoted',
                id: rawTweetData.quoted_status_id_str
            });
        }
    
        // Handling user information
        tweetData.includes.users = tweetData.includes.users || [];
        tweetData.includes.users.push({
            id: rawTweetData.user.id_str,
            name: rawTweetData.user.name,
            username: rawTweetData.user.screen_name,
            profile_image_url: rawTweetData.user.profile_image_url_https,
            created_at: rawTweetData.user.created_at,
            description: rawTweetData.user.description,
            verified: rawTweetData.user.verified,
            protected: rawTweetData.user.protected,
            public_metrics: {
                followers_count: rawTweetData.user.followers_count,
                following_count: rawTweetData.user.friends_count,
                tweet_count: rawTweetData.user.statuses_count,
                listed_count: rawTweetData.user.listed_count
            }
        });
    
        // Handling polls (v1.1 doesn't support polls explicitly)
        if (rawTweetData.attachments?.poll_ids) {
            tweetData.attachments.poll_ids = rawTweetData.attachments.poll_ids;
        }
    
        return tweetData;
    }

    async getOEmbedData(url: URL) : Promise<OEmbedData> {
        const tweetId = await this.getTweetId(url);

        const tweetData = await this._dependencies._fetcher(tweetId);
        const oembed = {
            tweet_data: await this.mapTweetToTweetData(tweetData),
            type: 'tweet'
        };
        
        return oembed;
    }
}
