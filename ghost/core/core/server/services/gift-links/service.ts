import crypto from 'crypto';
import errors from '@tryghost/errors';
import {z} from 'zod';
import type {Knex} from 'knex';
import {type ActionEvent, type LogAction, type RequestContext} from '../actions';
import {GiftLinkToken, type GiftLink, type Post} from './models';
import * as queries from './queries';

export function generateGiftLinkToken(): GiftLinkToken {
    return GiftLinkToken.parse(crypto.randomBytes(24).toString('base64url'));
}

// The history UI only surfaces a verb-specific label (action_name) for 'edited' events; 'added' and
// 'deleted' render as the bare event. So 'reset' maps to 'edited' to read as "reset", while
// 'add'/'remove' read as plain "added"/"deleted".
const COMMANDS = {
    add: 'added',
    reset: 'edited',
    remove: 'deleted'
} as const satisfies Record<string, ActionEvent>;

type GiftLinkVerb = keyof typeof COMMANDS;

export class GiftLinksService {
    private knex: Knex;
    private logAction: LogAction;

    constructor({knex, logAction}: {knex: Knex; logAction: LogAction}) {
        this.knex = knex;
        this.logAction = logAction;
    }

    async getPost(postId: string): Promise<Post> {
        return this.requirePost(postId);
    }

    async getPostByToken(token: string): Promise<Post | null> {
        const row = await queries.liveLinkForToken(token)(this.knex);
        return row ? {id: row.post_id, giftLinks: [z.decode(queries.giftLinkCodec, row)]} : null;
    }

    async isValidTokenForPost(token: string, postId: string): Promise<boolean> {
        return (await this.getPostByToken(token))?.id === postId;
    }

    async ensure(context: RequestContext, postId: string): Promise<Post> {
        const post = await this.requirePost(postId);
        if (post.giftLinks.length) {
            return post;
        }
        const minted = await this.mint(postId);
        await this.recordAction(context, 'add', postId);
        return minted;
    }

    async create(context: RequestContext, postId: string): Promise<Post> {
        await this.requirePost(postId);
        const minted = await this.mint(postId);
        await this.recordAction(context, 'reset', postId);
        return minted;
    }

    // Remove every live association; the gift_links rows stay as history.
    async removeAll(context: RequestContext): Promise<number> {
        const removed = await this.knex('post_gift_links').del();
        if (removed > 0) {
            await this.recordAction(context, 'remove', null);
        }
        return removed;
    }

    private async requirePost(postId: string): Promise<Post> {
        const rows = await queries.liveLinksForPost(postId)(this.knex);
        if (rows.length === 0) {
            throw new errors.NotFoundError({message: `Post ${postId} does not exist.`});
        }
        const giftLinks = rows
            .filter((row): row is z.input<typeof queries.GiftLinkRow> => row.token !== null)
            .map(row => z.decode(queries.giftLinkCodec, row));
        return {id: postId, giftLinks};
    }

    private async mint(postId: string): Promise<Post> {
        const now = new Date();
        const link: GiftLink = {token: generateGiftLinkToken(), createdAt: now};
        await this.knex.transaction(async (trx) => {
            await trx('gift_links').insert({...z.encode(queries.giftLinkCodec, link), post_id: postId});
            await trx('post_gift_links')
                .insert({post_id: postId, gift_link_token: link.token, created_at: now})
                .onConflict('post_id')
                .merge({gift_link_token: link.token, updated_at: now});
        });
        return {id: postId, giftLinks: [link]};
    }

    private async recordAction(context: RequestContext, verb: GiftLinkVerb, subject: string | null): Promise<void> {
        if (!context.actor) {
            return;
        }
        const event = COMMANDS[verb];
        await this.logAction({
            event,
            resourceType: 'gift_link',
            resourceId: subject,
            actor: context.actor,
            ...(event === 'edited' ? {actionName: verb} : {})
        });
    }
}
