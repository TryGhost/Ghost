const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    webhookAlreadyExists: 'Target URL has already been used for this event.',
    nonExistingIntegrationIdProvided: {
        message: `Validation failed for '{key}'.`,
        context: `'integration_id' value does not match any existing integration.`,
        help: `Provide the 'integration_id' of an existing integration.`
    }
};

class WebhooksService {
    constructor({WebhookModel}) {
        this.WebhookModel = WebhookModel;
    }

    async add(data, options) {
        const webhook = await this.WebhookModel.getByEventAndTarget(
            data.webhooks[0].event,
            data.webhooks[0].target_url,
            options
        );

        if (webhook) {
            throw new ValidationError({
                message: messages.webhookAlreadyExists
            });
        }

        try {
            const newWebhook = await this.WebhookModel.add(data.webhooks[0], options);
            return newWebhook;
        } catch (error) {
            // A non-existent integration_id violates the webhooks→integrations FK.
            // MySQL reports errno 1452. SQLite reports it differently per driver:
            // node-sqlite3 messages were prefixed 'SQLITE_CONSTRAINT: ...', while
            // better-sqlite3 messages are bare ('FOREIGN KEY constraint failed') and
            // its extended 'SQLITE_CONSTRAINT_FOREIGNKEY' code is normalized down to
            // the primary 'SQLITE_CONSTRAINT' by overrides.js before reaching here —
            // so match the message rather than the (driver-specific) extended code.
            if (error.errno === 1452
                || (error.code === 'SQLITE_CONSTRAINT' && /FOREIGN KEY constraint failed/.test(error.message))
                || (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY')) {
                throw new ValidationError({
                    message: tpl(messages.nonExistingIntegrationIdProvided.message, {
                        key: 'integration_id'
                    }),
                    context: messages.nonExistingIntegrationIdProvided.context,
                    help: messages.nonExistingIntegrationIdProvided.help
                });
            }

            throw error;
        }
    }
}

/**
 * @returns {WebhooksService} instance of the WebhooksService
 */
const getWebhooksServiceInstance = ({WebhookModel}) => {
    return new WebhooksService({WebhookModel});
};

module.exports = getWebhooksServiceInstance;
