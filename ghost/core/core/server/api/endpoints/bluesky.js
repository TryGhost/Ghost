const models = require('../../models');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'bluesky',

    /**
     * POST /ghost/api/admin/bluesky/publish
     * Publish a post to Bluesky with custom text
     * Body: { post_id, text }
     */
    publish: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        options: [],
        validation: {
            data: {
                post_id: {required: true},
                text: {required: true}
            }
        },
        permissions: true,
        async query(frame) {
            const {post_id, text} = frame.data.bluesky[0];

            const post = await models.Post.findOne({id: post_id}, {withRelated: ['posts_meta']});
            if (!post) {
                throw new errors.NotFoundError({message: 'Post not found'});
            }

            const blueskySync = require('../../services/bluesky-sync');
            if (!blueskySync.isEnabled()) {
                throw new errors.ValidationError({message: 'Bluesky is not configured. Go to Settings > Bluesky to connect your account.'});
            }

            let syncService = blueskySync.getSyncService();
            if (!syncService) {
                await blueskySync.init();
                syncService = blueskySync.getSyncService();
            }

            if (!syncService) {
                throw new errors.InternalServerError({message: 'Failed to initialize Bluesky sync'});
            }

            const urlUtils = require('../../../shared/url-utils');
            const postUrl = urlUtils.getSiteUrl().replace(/\/$/, '') + '/' + post.get('slug') + '/';

            const result = await syncService.publishToBluesky({
                text,
                url: postUrl,
                title: post.get('title'),
                description: post.get('custom_excerpt') || post.get('plaintext')?.substring(0, 200) || ''
            });

            if (!result) {
                throw new errors.InternalServerError({message: 'Failed to publish to Bluesky'});
            }

            // Store the Bluesky post URI and URL on the post
            await models.PostsMeta.edit({
                bluesky_post_uri: result.uri,
                bluesky_post_url: result.url
            }, {id: post.related('posts_meta').get('id'), post_id: post_id});

            logging.info(`Bluesky: published post "${post.get('title')}" to Bluesky`);

            return {
                bluesky: [{
                    uri: result.uri,
                    url: result.url
                }]
            };
        }
    },

    /**
     * PUT /ghost/api/admin/bluesky/link
     * Link an existing Bluesky post to a Ghost post
     * Body: { post_id, bluesky_url }
     */
    link: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        options: [],
        validation: {
            data: {
                post_id: {required: true},
                bluesky_url: {required: true}
            }
        },
        permissions: {
            method: 'publish'
        },
        async query(frame) {
            const {post_id, bluesky_url} = frame.data.bluesky[0];

            const post = await models.Post.findOne({id: post_id}, {withRelated: ['posts_meta']});
            if (!post) {
                throw new errors.NotFoundError({message: 'Post not found'});
            }

            // Parse bsky.app URL to AT URI
            // e.g. https://bsky.app/profile/handle.bsky.social/post/rkey123
            const bskyMatch = bluesky_url.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/]+)/);
            if (!bskyMatch) {
                throw new errors.ValidationError({message: 'Invalid Bluesky post URL. Expected format: https://bsky.app/profile/handle/post/id'});
            }

            const [, handleOrDid, rkey] = bskyMatch;

            // Resolve handle to DID if needed
            let did = handleOrDid;
            if (!did.startsWith('did:')) {
                try {
                    const BskyAgent = (await import('@atproto/api')).BskyAgent;
                    const agent = new BskyAgent({service: 'https://public.api.bsky.app'});
                    const profile = await agent.getProfile({actor: handleOrDid});
                    did = profile.data.did;
                } catch (err) {
                    throw new errors.ValidationError({message: `Could not resolve Bluesky handle: ${handleOrDid}`});
                }
            }

            const atUri = `at://${did}/app.bsky.feed.post/${rkey}`;

            // Store on posts_meta
            const metaId = post.related('posts_meta')?.get('id');
            if (metaId) {
                await models.PostsMeta.edit({
                    bluesky_post_uri: atUri,
                    bluesky_post_url: bluesky_url
                }, {id: metaId});
            } else {
                await models.PostsMeta.add({
                    post_id: post_id,
                    bluesky_post_uri: atUri,
                    bluesky_post_url: bluesky_url
                });
            }

            logging.info(`Bluesky: linked post "${post.get('title')}" to ${bluesky_url}`);

            return {
                bluesky: [{
                    uri: atUri,
                    url: bluesky_url
                }]
            };
        }
    }
};

module.exports = controller;
