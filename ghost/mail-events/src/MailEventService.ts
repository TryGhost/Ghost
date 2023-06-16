const crypto = require('crypto');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

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

const VALIDATION_MESSAGES = {
    serviceNotConfigured: 'MailEventService is not configured',
    payloadSignatureMissing: 'Payload is missing "signature"',
    payloadSignatureInvalid: '"signature" is invalid',
    payloadEventsMissing: 'Payload is missing "mail_events"',
    payloadEventsInvalid: '"mail_events" is not an array',
    payloadEventKeyMissing: 'Event [{idx}] is missing "{key}"'
};

export class MailEventService {
    constructor(
        private eventRepository: MailEventRepository,
        private payloadSigningKey: string
    ) {}

    async processPayload(payload: Payload) {
        // Verify that the service is configured correctly - We expect a string
        // for the payload signing key but as a safeguard we check the type here
        // to prevent any unexpected behaviour if anything else is passed in (i.e undefined)
        if (typeof this.payloadSigningKey !== 'string') {
            throw new errors.InternalServerError({
                message: tpl(VALIDATION_MESSAGES.serviceNotConfigured)
            });
        }

        // Verify the payload
        this.verifyPayload(payload);

        // Store known events
        const eventTypes = new Set<string>(Object.values(EventType) as string[]);

        for (const payloadEvent of payload.mail_events) {
            if (eventTypes.has(payloadEvent.event) === false) {
                continue;
            }

            try {
                await this.eventRepository.save(
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

    private verifyPayload(payload: Payload) {
        const data = JSON.stringify(payload.mail_events);

        const signature = crypto
            .createHmac('sha256', this.payloadSigningKey)
            .update(data)
            .digest('hex');

        if (signature !== payload.signature) {
            throw new errors.UnauthorizedError({
                message: tpl(VALIDATION_MESSAGES.payloadSignatureInvalid)
            });
        }
    }
}
