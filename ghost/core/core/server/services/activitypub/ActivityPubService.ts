import ObjectID from 'bson-objectid';
import {Knex} from 'knex';
import {IdentityTokenService} from '../identity-tokens/IdentityTokenService';
import fetch from 'node-fetch';

type ExpectedWebhook = {
    event: string;
    target_url: URL;
    api_version: string;
    secret: string;
};

interface Logger {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
}

export class ActivityPubService {
    constructor(
        private knex: Knex,
        private siteUrl: URL,
        private logging: Logger,
        private identityTokenService: IdentityTokenService
    ) {}

    getExpectedWebhooks(secret: string): ExpectedWebhook[] {
        return [{
            event: 'post.published',
            target_url: new URL('.ghost/activitypub/webhooks/post/published', this.siteUrl),
            api_version: 'v5.100.0',
            secret
        }, {
            event: 'site.changed',
            target_url: new URL('.ghost/activitypub/webhooks/site/changed', this.siteUrl),
            api_version: 'v5.100.0',
            secret
        }];
    }

    async checkWebhookState(expectedWebhooks: ExpectedWebhook[], integration: {id: string}) {
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

    async getWebhookSecret(): Promise<string | null> {
        try {
            const ownerUser = await this.knex('users')
                .select('users.*')
                .join('roles_users', 'users.id', 'roles_users.user_id')
                .join('roles', 'roles.id', 'roles_users.role_id')
                .where('roles.name', 'Owner')
                .first();
            const token = await this.identityTokenService.getTokenForUser(ownerUser.email, 'Owner');

            const res = await fetch(new URL('.ghost/activitypub/site', this.siteUrl), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const body = await res.json();

            return body.webhook_secret;
        } catch (err: unknown) {
            this.logging.error(`Could not get webhook secret for ActivityPub ${err}`);
            return null;
        }
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
                id: (new ObjectID).toHexString(),
                event: expectedWebhook.event,
                target_url: expectedWebhook.target_url.href,
                api_version: expectedWebhook.api_version,
                name: `ActivityPub ${expectedWebhook.event} Webhook`,
                secret: secret,
                integration_id: integration.id,
                created_at: this.knex.raw('current_timestamp'),
                created_by: '1'
            };
        });

        await this.knex
            .insert(webhooksToInsert)
            .into('webhooks');
    }
}
