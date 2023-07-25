import crypto from 'crypto';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

import {MailEvent} from './MailEvent';
import {MailEventRepository} from './MailEventRepository';

/**
 * @see https://documentation.mailgun.com/en/latest/user_manual.html#events-1
 */
enum EventType {
    CLICKED = 'clicked',
    COMPLAINED = 'complained',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    OPENED = 'opened',
    UNSUBSCRIBED = 'unsubscribed'
}

interface PayloadEvent {
    id: string;
    timestamp: number; // Unix timestamp in seconds
    event: string;
    message: {
        headers: {
            'message-id': string;
        }
    },
    recipient: string;
}

interface Payload {
    signature: string;
    mail_events: PayloadEvent[];
}

interface Labs {
    isSet(key: string): boolean;
}

interface Config {
    get(key: string): any;
}

const VALIDATION_MESSAGES = {
    signingKeyNotConfigured: 'payload signing key is not configured',
    payloadSignatureMissing: 'Payload is missing "signature"',
    payloadSignatureInvalid: '"signature" is invalid',
    payloadEventsMissing: 'Payload is missing "mail_events"',
    payloadEventsInvalid: '"mail_events" is not an array',
    payloadEventKeyMissing: 'Event [{idx}] is missing "{key}"'
};

export class MailEventService {
    static readonly LABS_KEY = 'mailEvents';
    static readonly CONFIG_KEY_PAYLOAD_SIGNING_KEY = 'hostSettings:mailEventsPayloadSigningKey';

    constructor(
        private mailEventRepository: MailEventRepository,
        private config: Config,
        private labs: Labs
    ) {}

    async processPayload(payload: Payload) {
        if (this.labs.isSet(MailEventService.LABS_KEY) === false) {
            throw new errors.NotFoundError();
        }

        const payloadSigningKey = this.config.get(MailEventService.CONFIG_KEY_PAYLOAD_SIGNING_KEY);

        // Verify that the service is configured correctly - We expect a string
        // for the payload signing key but as a safeguard we check the type here
        // to prevent any unexpected behaviour
        if (typeof payloadSigningKey !== 'string') {
            throw new errors.InternalServerError({
                message: tpl(VALIDATION_MESSAGES.signingKeyNotConfigured)
            });
        }

        // Verify the payload
        this.verifyPayload(payload, payloadSigningKey);

        // Store known events
        const eventTypes = new Set<string>(Object.values(EventType) as string[]);

        for (const payloadEvent of payload.mail_events) {
            if (eventTypes.has(payloadEvent.event) === false) {
                continue;
            }

            try {
                await this.mailEventRepository.save(
                    new MailEvent(
                        payloadEvent.id,
                        payloadEvent.event,
                        payloadEvent.message.headers['message-id'],
                        payloadEvent.recipient,
                        payloadEvent.timestamp * 1000
                    )
                );
            } catch (err) {
                throw new errors.InternalServerError({
                    message: 'Event could not be stored',
                    err: err
                });
            }
        }
    }

    validatePayload(payload: Payload) {
        if (payload.signature === undefined) {
            throw new errors.ValidationError({
                message: tpl(VALIDATION_MESSAGES.payloadSignatureMissing)
            });
        }

        if (typeof payload.signature !== 'string') {
            throw new errors.ValidationError({
                message: tpl(VALIDATION_MESSAGES.payloadSignatureInvalid)
            });
        }

        if (payload.mail_events === undefined) {
            throw new errors.ValidationError({
                message: tpl(VALIDATION_MESSAGES.payloadEventsMissing)
            });
        }

        if (Array.isArray(payload.mail_events) === false) {
            throw new errors.ValidationError({
                message: tpl(VALIDATION_MESSAGES.payloadEventsInvalid)
            });
        }

        const expectedKeys: (keyof PayloadEvent)[] = ['id', 'timestamp', 'event', 'message', 'recipient'];

        payload.mail_events.forEach((payloadEvent, idx) => {
            expectedKeys.forEach((key) => {
                if (payloadEvent[key] === undefined) {
                    throw new errors.ValidationError({
                        message: tpl(VALIDATION_MESSAGES.payloadEventKeyMissing, {idx, key})
                    });
                }

                if (key === 'message' && payloadEvent.message.headers?.['message-id'] === undefined) {
                    throw new errors.ValidationError({
                        message: tpl(VALIDATION_MESSAGES.payloadEventKeyMissing, {idx, key: 'message.headers.message-id'})
                    });
                }
            });
        });
    }

    private verifyPayload(payload: Payload, payloadSigningKey: string) {
        const data = JSON.stringify(payload.mail_events);

        const signature = crypto
            .createHmac('sha256', payloadSigningKey)
            .update(data)
            .digest('hex');

        if (signature !== payload.signature) {
            throw new errors.UnauthorizedError({
                message: tpl(VALIDATION_MESSAGES.payloadSignatureInvalid)
            });
        }
    }
}
