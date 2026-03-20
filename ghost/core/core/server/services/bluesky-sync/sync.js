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
     * Resolve AT URI from a bsky.app URL (e.g. https://bsky.app/profile/handle/post/rkey)
     */
    async resolveBlueskyUrl(url) {
        try {
            const match = url.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/);
            if (!match) {
                return null;
            }
            const [, handleOrDid, rkey] = match;
            let did = handleOrDid;
            if (!did.startsWith('did:')) {
                // Resolve handle to DID
                const resolved = await this.agent.resolveHandle({handle: did});
                did = resolved.data.did;
            }
            return `at://${did}/app.bsky.feed.post/${rkey}`;
        } catch (err) {
            logging.error({message: `Bluesky sync: error resolving URL ${url}`, err});
            return null;
        }
    }

    /**
     * Find all posts that have a linked Bluesky thread and poll each one
     */
    async pollAllThreads() {
        try {
            logging.info('Bluesky sync: polling all threads');

            // Resolve any posts that have a URL but no AT URI
            const postsWithUrlOnly = await models.PostsMeta.findAll({
                filter: 'bluesky_post_url:-null+bluesky_post_uri:null'
            });
            const urlOnlyItems = postsWithUrlOnly?.models || postsWithUrlOnly || [];
            for (const meta of urlOnlyItems) {
                const url = meta.get('bluesky_post_url');
                if (url) {
                    const uri = await this.resolveBlueskyUrl(url);
                    if (uri) {
                        await models.PostsMeta.edit({bluesky_post_uri: uri}, {id: meta.id});
                        logging.info(`Bluesky sync: resolved URI for ${url} → ${uri}`);
                    }
                }
            }

            const postsMeta = await models.PostsMeta.findAll({
                filter: 'bluesky_post_uri:-null'
            });

            const items = postsMeta?.models || postsMeta || [];
            logging.info(`Bluesky sync: found ${items.length} posts with Bluesky threads`);

            if (!items.length) {
                return;
            }

            for (const meta of items) {
                const postUri = meta.get('bluesky_post_uri');
                const postId = meta.get('post_id');
                if (postUri && postId) {
                    logging.info(`Bluesky sync: syncing thread ${postUri} for post ${postId}`);
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
        logging.info(`Bluesky sync: processing ${replies.length} replies (parent: ${parentCommentId || 'root'})`);
        for (const reply of replies) {
            if (!reply?.post?.uri || !reply?.post?.record?.text) {
                continue;
            }

            const replyUri = reply.post.uri;
            const replyText = reply.post.record.text;
            const replyAuthor = reply.post.author;
            const replyCreatedAt = reply.post.record.createdAt;

            logging.info(`Bluesky sync: checking reply by ${replyAuthor.handle}: "${replyText.substring(0, 50)}"`);

            // Check if we already synced this reply
            const existing = await models.Comment.findOne({bluesky_reply_uri: replyUri});
            if (existing) {
                logging.info(`Bluesky sync: already synced ${replyUri}`);
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
    async postCommentToBluesky({postId, commentText, memberName, memberBlueskyDid, memberScope, parentBlueskyUri}) {
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

            // Try to post as the user if they have write scope + active session
            let postingAgent = null;
            let postingAsUser = false;

            if (memberBlueskyDid && memberScope && memberScope.includes('transition:generic')) {
                try {
                    const atprotoOAuth = require('../atproto-oauth');
                    postingAgent = await atprotoOAuth.restoreSession(memberBlueskyDid);
                    if (postingAgent) {
                        postingAsUser = true;
                        logging.info(`Bluesky sync: posting as user ${memberName} (${memberBlueskyDid})`);
                    }
                } catch (err) {
                    logging.warn({message: 'Bluesky sync: could not restore user session, falling back to blog account', err});
                }
            }

            // Fall back to blog account
            if (!postingAgent) {
                postingAgent = this.agent;
            }

            // Format text — if posting as user, just the comment. If as blog, attribute it.
            let text;
            if (postingAsUser) {
                text = commentText;
            } else if (memberBlueskyDid) {
                text = `${memberName}: ${commentText}`;
            } else {
                text = `${memberName} commented: ${commentText}`;
            }

            // Truncate to Bluesky's 300-char limit
            if (text.length > 300) {
                text = text.substring(0, 297) + '...';
            }

            let response;
            try {
                response = await postingAgent.post({
                    text,
                    reply: replyRef
                });
                logging.info(`Bluesky sync: posted comment to thread by ${memberName} (as ${postingAsUser ? 'user' : 'blog'})`);
            } catch (postErr) {
                if (postingAsUser) {
                    // User post failed — scope may have been revoked/downgraded
                    // Update DB so the upgrade prompt shows again
                    logging.warn({message: `Bluesky sync: posting as user failed, falling back to blog account`, err: postErr});
                    try {
                        const member = await models.Member.findOne({atproto_did: memberBlueskyDid});
                        if (member) {
                            await models.Member.edit({atproto_scope: 'atproto'}, {id: member.id});
                            logging.info(`Bluesky sync: downgraded scope for ${memberBlueskyDid} — user will see upgrade prompt again`);
                        }
                    } catch (dbErr) {
                        logging.error({message: 'Bluesky sync: failed to downgrade scope in DB', err: dbErr});
                    }
                    text = `${memberName}: ${commentText}`;
                    if (text.length > 300) {
                        text = text.substring(0, 297) + '...';
                    }
                    response = await this.agent.post({
                        text,
                        reply: replyRef
                    });
                    logging.info(`Bluesky sync: posted comment to thread by ${memberName} (as blog, after user post failed)`);
                } else {
                    throw postErr;
                }
            }
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
