const logging = require('@tryghost/logging');
const models = require('../../models');

let BskyAgent;

/**
 * BlueskySync — bidirectional comment sync between Ghost and Bluesky
 *
 * Inbound: polls Bluesky threads linked to Ghost posts, creates Ghost comments
 * for new replies via the existing admin comments.add endpoint.
 *
 * Outbound: when a Ghost comment is created on a post with a linked Bluesky thread,
 * posts it as a reply on Bluesky (from user's account if Bluesky member,
 * from blog bot account if email-only member).
 */
class BlueskySync {
    constructor(config) {
        this.handle = config.handle;
        this.did = config.did;
        this.appPassword = config.appPassword;
        this.agent = null;
        this.pollInterval = null;
    }

    async loadDeps() {
        if (!BskyAgent) {
            const mod = await import('@atproto/api');
            BskyAgent = mod.BskyAgent;
        }
    }

    /**
     * Authenticate the blog's Bluesky account
     */
    async authenticate() {
        await this.loadDeps();
        this.agent = new BskyAgent({service: 'https://bsky.social'});
        await this.agent.login({
            identifier: this.handle,
            password: this.appPassword
        });
        logging.info(`Bluesky sync: authenticated as ${this.handle}`);
    }

    /**
     * Start the sync polling loop
     */
    async start() {
        try {
            await this.authenticate();
            // Poll every 2 minutes
            this.pollInterval = setInterval(() => this.pollAllThreads(), 2 * 60 * 1000);
            // Initial poll
            await this.pollAllThreads();
        } catch (err) {
            logging.error({message: 'Bluesky sync: failed to start', err});
        }
    }

    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Find all posts that have a linked Bluesky thread and poll each one
     */
    async pollAllThreads() {
        try {
            const postsMeta = await models.PostsMeta.findAll({
                filter: 'bluesky_post_uri:-null'
            });

            if (!postsMeta || !postsMeta.length) {
                return;
            }

            for (const meta of postsMeta.models || postsMeta) {
                const postUri = meta.get('bluesky_post_uri');
                const postId = meta.get('post_id');
                if (postUri && postId) {
                    await this.syncThread(postId, postUri);
                }
            }
        } catch (err) {
            logging.error({message: 'Bluesky sync: poll error', err});
        }
    }

    /**
     * Sync a single Bluesky thread into Ghost comments
     */
    async syncThread(postId, threadUri) {
        try {
            const thread = await this.agent.getPostThread({
                uri: threadUri,
                depth: 10
            });

            if (!thread?.data?.thread?.replies) {
                return;
            }

            await this.processReplies(postId, thread.data.thread.replies, null);
        } catch (err) {
            logging.error({message: `Bluesky sync: error syncing thread ${threadUri}`, err});
        }
    }

    /**
     * Recursively process Bluesky replies and create Ghost comments
     */
    async processReplies(postId, replies, parentCommentId) {
        for (const reply of replies) {
            if (!reply?.post?.uri || !reply?.post?.record?.text) {
                continue;
            }

            const replyUri = reply.post.uri;
            const replyText = reply.post.record.text;
            const replyAuthor = reply.post.author;
            const replyCreatedAt = reply.post.record.createdAt;

            // Check if we already synced this reply
            const existing = await models.Comment.findOne({bluesky_reply_uri: replyUri});
            if (existing) {
                // Still process nested replies in case there are new ones
                if (reply.replies?.length) {
                    await this.processReplies(postId, reply.replies, existing.id);
                }
                continue;
            }

            // Find or create a Ghost member for this Bluesky user
            const member = await this.findOrCreateMember(replyAuthor);
            if (!member) {
                continue;
            }

            // Create the Ghost comment
            try {
                const commentData = {
                    post_id: postId,
                    member_id: member.id,
                    html: `<p>${this.escapeHtml(replyText)}</p>`,
                    bluesky_reply_uri: replyUri,
                    created_at: replyCreatedAt ? new Date(replyCreatedAt) : new Date()
                };

                if (parentCommentId) {
                    commentData.parent_id = parentCommentId;
                    delete commentData.post_id;
                }

                const comment = await models.Comment.add(commentData);

                logging.info(`Bluesky sync: created comment for reply by ${replyAuthor.handle}`);

                // Process nested replies
                if (reply.replies?.length) {
                    await this.processReplies(postId, reply.replies, comment.id);
                }
            } catch (err) {
                logging.error({message: `Bluesky sync: error creating comment for ${replyUri}`, err});
            }
        }
    }

    /**
     * Find or create a Ghost member for a Bluesky user
     */
    async findOrCreateMember(author) {
        try {
            // Look up by DID first
            let member = await models.Member.findOne({atproto_did: author.did});
            if (member) {
                return member;
            }

            // Create new member with synthetic email
            const urlUtils = require('../../../shared/url-utils');
            const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');
            const domain = new URL(siteUrl).hostname;
            const syntheticEmail = `bsky-${author.handle.replace(/\./g, '-')}@${domain}`;

            member = await models.Member.add({
                email: syntheticEmail,
                name: author.displayName || author.handle,
                status: 'free',
                atproto_did: author.did,
                bluesky_handle: author.handle,
                bluesky_avatar_url: author.avatar || null
            });

            logging.info(`Bluesky sync: created member for ${author.handle}`);
            return member;
        } catch (err) {
            logging.error({message: `Bluesky sync: error finding/creating member for ${author.handle}`, err});
            return null;
        }
    }

    /**
     * Post a Ghost comment to Bluesky as a reply in the linked thread
     *
     * @param {object} options
     * @param {string} options.postId - Ghost post ID
     * @param {string} options.commentHtml - Comment HTML content
     * @param {string} options.memberName - Commenter's display name
     * @param {string} options.memberBlueskyDid - Commenter's Bluesky DID (if they have one)
     * @param {string} options.parentBlueskyUri - Bluesky URI of the parent reply (for threading)
     * @returns {Promise<string|null>} The Bluesky reply URI, or null
     */
    async postCommentToBluesky({postId, commentText, memberName, memberBlueskyDid, parentBlueskyUri}) {
        try {
            // Get the Bluesky thread URI for this post
            const postMeta = await models.PostsMeta.findOne({post_id: postId});
            if (!postMeta) {
                return null;
            }

            const threadUri = postMeta.get('bluesky_post_uri');
            if (!threadUri) {
                return null;
            }

            // Parse the thread URI to get repo and rkey
            const threadParts = this.parseAtUri(threadUri);
            if (!threadParts) {
                return null;
            }

            // Determine reply target — thread root or a specific reply
            const replyRef = {
                root: {
                    uri: threadUri,
                    cid: await this.getCid(threadUri)
                }
            };

            if (parentBlueskyUri) {
                replyRef.parent = {
                    uri: parentBlueskyUri,
                    cid: await this.getCid(parentBlueskyUri)
                };
            } else {
                replyRef.parent = replyRef.root;
            }

            // Format the text — attribute if not from a Bluesky user
            let text;
            if (memberBlueskyDid) {
                // Bluesky user commenting on Ghost — post as the blog bot but clearly attributed
                text = `${memberName}: ${commentText}`;
            } else {
                // Email-only user
                text = `${memberName} commented: ${commentText}`;
            }

            // Truncate to Bluesky's 300-char limit
            if (text.length > 300) {
                text = text.substring(0, 297) + '...';
            }

            const response = await this.agent.post({
                text,
                reply: replyRef
            });

            logging.info(`Bluesky sync: posted comment to thread by ${memberName}`);
            return response.uri;
        } catch (err) {
            logging.error({message: 'Bluesky sync: error posting comment to Bluesky', err});
            return null;
        }
    }

    /**
     * Publish a post to Bluesky with custom text
     *
     * @param {object} options
     * @param {string} options.text - The Bluesky post text
     * @param {string} options.url - URL to the Ghost post
     * @param {string} options.title - Post title (for link card)
     * @param {string} options.description - Post excerpt (for link card)
     * @returns {Promise<{uri: string, url: string}|null>}
     */
    async publishToBluesky({text, url, title, description}) {
        try {
            // Create the post with an external embed (link card)
            const postData = {
                text,
                embed: {
                    $type: 'app.bsky.embed.external',
                    external: {
                        uri: url,
                        title: title || '',
                        description: description || ''
                    }
                }
            };

            const response = await this.agent.post(postData);

            // Convert AT URI to bsky.app URL
            const parts = this.parseAtUri(response.uri);
            const bskyUrl = parts
                ? `https://bsky.app/profile/${this.handle}/post/${parts.rkey}`
                : null;

            logging.info(`Bluesky sync: published post to Bluesky`);
            return {uri: response.uri, url: bskyUrl};
        } catch (err) {
            logging.error({message: 'Bluesky sync: error publishing to Bluesky', err});
            return null;
        }
    }

    /**
     * Get the CID for an AT Protocol record by URI
     */
    async getCid(uri) {
        try {
            const parts = this.parseAtUri(uri);
            if (!parts) {
                return null;
            }
            const response = await this.agent.com.atproto.repo.getRecord({
                repo: parts.repo,
                collection: parts.collection,
                rkey: parts.rkey
            });
            return response.data.cid;
        } catch (err) {
            logging.error({message: `Bluesky sync: error getting CID for ${uri}`, err});
            return null;
        }
    }

    /**
     * Parse an AT Protocol URI into its components
     * at://did:plc:abc123/app.bsky.feed.post/rkey123
     */
    parseAtUri(uri) {
        const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
        if (!match) {
            return null;
        }
        return {repo: match[1], collection: match[2], rkey: match[3]};
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

module.exports = BlueskySync;
