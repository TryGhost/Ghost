"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityPubService = void 0;
const bson_objectid_1 = __importDefault(require("bson-objectid"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class ActivityPubService {
    knex;
    siteUrl;
    logging;
    identityTokenService;
    constructor(knex, siteUrl, logging, identityTokenService) {
        this.knex = knex;
        this.siteUrl = siteUrl;
        this.logging = logging;
        this.identityTokenService = identityTokenService;
    }
    getExpectedWebhooks(secret) {
    const events = [
        'post.published',
        'post.deleted',
        'post.unpublished',
        'post.published.edited'
    ];

    const paths = {
        'post.published': '/ghost/activitypub/v1/webhooks/post/published',
        'post.deleted': '/ghost/activitypub/v1/webhooks/post/deleted',
        'post.unpublished': '/ghost/activitypub/v1/webhooks/post/unpublished',
        'post.published.edited': '/ghost/activitypub/v1/webhooks/post/updated'
    };

    return events.map(event => {
        // ensure the URL is absolute
        const url = new URL(paths[event], this.siteUrl);
        return {
            event,
            target_url: url,
            api_version: 'v5.100.0',
            secret
        };
    });
    }
    async checkWebhookState(expectedWebhooks, integration) {
        this.logging.info(`Checking ActivityPub Webhook state`);
        const webhooks = await this.knex
            .select('*')
            .from('webhooks')
            .where('integration_id', '=', integration.id);
        if (webhooks.length !== expectedWebhooks.length) {
            this.logging.warn(`Expected ${expectedWebhooks.length} webhooks for ActivityPub`);
            return false;
        }
        for (const expectedWebhook of expectedWebhooks) {
            const foundWebhook = webhooks.find((webhook) => {
                return webhook.event === expectedWebhook.event && webhook.target_url === expectedWebhook.target_url.href && webhook.secret === expectedWebhook.secret;
            });
            if (!foundWebhook) {
                this.logging.error(`Could not find webhook for ${expectedWebhook.event} ${expectedWebhook.target_url}`);
                return false;
            }
        }
        return true;
    }
    async getWebhookSecret() {
        try {
            const token = await this.getOwnerUserToken();
            const res = await (0, node_fetch_1.default)(new URL('.ghost/activitypub/v1/site', this.siteUrl), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const body = await res.json();
            return body.webhook_secret;
        }
        catch (err) {
            this.logging.error(`Could not get webhook secret for ActivityPub ${err}`);
            return null;
        }
    }
    async disable() {
        await this.removeWebhooks();
        await this.disableSite();
    }
    async enable() {
        await this.initialiseWebhooks();
    }
    async removeWebhooks() {
        const integration = await this.knex
            .select('*')
            .from('integrations')
            .where('slug', '=', 'ghost-activitypub')
            .andWhere('type', '=', 'internal')
            .first();
        if (!integration) {
            this.logging.error('No ActivityPub integration found - cannot remove webhooks');
            return;
        }
        await this.knex
            .del()
            .from('webhooks')
            .where('integration_id', '=', integration.id);
    }
    async initialiseWebhooks() {
        const integration = await this.knex
            .select('*')
            .from('integrations')
            .where('slug', '=', 'ghost-activitypub')
            .andWhere('type', '=', 'internal')
            .first();
        if (!integration) {
            this.logging.error('No ActivityPub integration found - cannot initialise');
            return;
        }
        const secret = await this.getWebhookSecret();
        if (!secret) {
            this.logging.error('No webhook secret found - cannot initialise');
            return;
        }
        const expectedWebhooks = this.getExpectedWebhooks(secret);
        const isInCorrectState = await this.checkWebhookState(expectedWebhooks, integration);
        if (isInCorrectState) {
            this.logging.info(`ActivityPub webhooks in correct state`);
            return;
        }
        this.logging.info(`ActivityPub webhooks in incorrect state, deleting all of them and starting fresh`);
        await this.knex
            .del()
            .from('webhooks')
            .where('integration_id', '=', integration.id);
        const webhooksToInsert = expectedWebhooks.map((expectedWebhook) => {
            return {
                id: (new bson_objectid_1.default).toHexString(),
                event: expectedWebhook.event,
                target_url: expectedWebhook.target_url.href,
                api_version: expectedWebhook.api_version,
                name: `ActivityPub ${expectedWebhook.event} Webhook`,
                secret: secret,
                integration_id: integration.id,
                created_at: this.knex.raw('current_timestamp')
            };
        });
        await this.knex
            .insert(webhooksToInsert)
            .into('webhooks');
    }
    async disableSite() {
        try {
            const token = await this.getOwnerUserToken();
            await (0, node_fetch_1.default)(new URL('.ghost/activitypub/v1/site', this.siteUrl), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
        catch (err) {
            this.logging.error(`Could not disable ActivityPub for site: ${this.siteUrl} due to: ${err}`);
        }
    }
    async getOwnerUserToken() {
        const ownerUser = await this.knex('users')
            .select('users.*')
            .join('roles_users', 'users.id', 'roles_users.user_id')
            .join('roles', 'roles.id', 'roles_users.role_id')
            .where('roles.name', 'Owner')
            .first();
        return await this.identityTokenService.getTokenForUser(ownerUser.email, 'Owner');
    }
}
exports.ActivityPubService = ActivityPubService;
