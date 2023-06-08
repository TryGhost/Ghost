import assert from 'assert';
import sinon from 'sinon';

import MailEvent from '../src/MailEvent';
import MailEventService from '../src/MailEventService';
import MailEventRepository from '../src/MailEventRepository';

const makePayloadEvent = (
    type: string,
    timestamp = Date.now()
) => ({
    id: 'event-id',
    timestamp: timestamp / 1000,
    event: type,
    message: {
        headers: {
            'message-id': 'message-id'
        }
    },
    recipient: 'message-recipient'
});

const PAYLOAD_SIGNING_KEY = 'abc123';

describe('MailEventService', function () {
    let repository: sinon.SinonStubbedInstance<MailEventRepository>;
    let service: MailEventService;

    beforeEach(function () {
        repository = sinon.createStubInstance(MailEventRepository);
        service = new MailEventService(repository, PAYLOAD_SIGNING_KEY);
    });

    describe('processPayload', function () {
        it('should reject if the service was not initialised with a valid payload signing key', async function () {
            service = new MailEventService(repository, undefined as any);

            await assert.rejects(
                service.processPayload({} as any),
                {
                    name: 'InternalServerError',
                    message: 'MailEventService is not configured'
                }
            );
        });

        it('should validate that the payload contains a signature', async function () {
            await assert.rejects(
                service.processPayload({} as any),
                {
                    name: 'ValidationError',
                    message: 'Payload is missing "signature"'
                }
            );
        });

        it('should validate that the payload contains a valid signature', async function () {
            await assert.rejects(
                service.processPayload({
                    signature: {}
                } as any),
                {
                    name: 'ValidationError',
                    message: '"signature" is invalid'
                }
            );
        });

        it('should validate that the payload contains events', async function () {
            await assert.rejects(
                service.processPayload({
                    signature: 'foobarbaz'
                } as any),
                {
                    name: 'ValidationError',
                    message: 'Payload is missing "events"'
                }
            );
        });

        it('should validate that the payload contains valid events', async function () {
            await assert.rejects(
                service.processPayload({
                    signature: 'foobarbaz',
                    events: {}
                } as any),
                {
                    name: 'ValidationError',
                    message: '"events" is not an array'
                }
            );
        });

        it('should validate that events in the payload are valid', async function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.recipient;

            const payload = {
                signature: 'foobarbaz',
                events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };
            await assert.rejects(
                service.processPayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "recipient"'
                }
            );
        });

        it('should validate that "message.headers.message-id" is present on an event', async function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.message.headers;

            const payload = {
                signature: 'foobarbaz',
                events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };
            await assert.rejects(
                service.processPayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "message.headers.message-id"'
                }
            );
        });

        it('should reject if payload verification fails', async function () {
            await assert.rejects(
                service.processPayload({
                    signature: 'foobarbaz',
                    events: [
                        makePayloadEvent('opened')
                    ]
                } as any),
                {
                    name: 'UnauthorizedError',
                    message: '"signature" is invalid'
                }
            );
        });

        it('should persist a single event', async function () {
            const payloadEvent = makePayloadEvent('opened');

            // Ensure a fixed timestamp is used so that we know the signature up front
            payloadEvent.timestamp = 1686665992511 / 1000;

            const payload = {
                signature: '9f2567330688b82759600fad93c93b3e8f571d397c33688a8620400af20b79b3',
                events: [
                    payloadEvent
                ]
            };

            await service.processPayload(payload);

            const persistedEvent = repository.persist.getCall(0).args[0];

            assert.ok(persistedEvent instanceof MailEvent);
            assert.equal(persistedEvent.id, payloadEvent.id);
        });

        it('should persist multiple events', async function () {
            const events = [
                makePayloadEvent('opened'),
                makePayloadEvent('opened')
            ];

            // Ensure fixed timestamps are used so that we know the signature up front
            events[0].timestamp = 1686665992511 / 1000;
            events[1].timestamp = 1686665992512 / 1000;

            const payload = {
                signature: '02959cc9731ee575b66969a508f545d19c5968b42a03fa398ce9c93d8e7df0a5',
                events
            };

            await service.processPayload(payload);

            assert.ok(repository.persist.calledTwice);
        });

        it('should ignore unknown events', async function () {
            const events = [
                makePayloadEvent('unknown-event'),
                makePayloadEvent('opened')
            ];

            // Ensure fixed timestamps are used so that we know the signature up front
            events[0].timestamp = 1686665992511 / 1000;
            events[1].timestamp = 1686665992512 / 1000;

            const payload = {
                signature: 'd6de350faa9ec56d739ec7ffd5cb4230f90f583df05fe59a6c1a41afac7048df',
                events
            };

            await service.processPayload(payload);

            assert.ok(repository.persist.calledOnce);
            assert.equal(repository.persist.getCall(0).args[0].type, 'opened');
        });

        it('should ensure event timestamps are converted to ms', async function () {
            const payloadEvent = makePayloadEvent('opened');

            // Ensure a fixed timestamp is used so that we know the signature up front
            payloadEvent.timestamp = 1686665992511 / 1000;

            const payload = {
                signature: '9f2567330688b82759600fad93c93b3e8f571d397c33688a8620400af20b79b3',
                events: [
                    payloadEvent
                ]
            };

            await service.processPayload(payload);

            assert.ok(repository.persist.calledOnce);

            const persistedEvent = repository.persist.getCall(0).args[0];

            assert.equal(persistedEvent.timestampMs, payloadEvent.timestamp * 1000);
        });

        it('should reject if an event can not be persisted', async function () {
            const payloadEvent = makePayloadEvent('opened');

            // Ensure a fixed timestamp is used so that we know the signature up front
            payloadEvent.timestamp = 1686665992511 / 1000;

            const payload = {
                signature: '9f2567330688b82759600fad93c93b3e8f571d397c33688a8620400af20b79b3',
                events: [
                    payloadEvent
                ]
            };

            repository.persist.rejects(new Error('foobarbaz'));

            await assert.rejects(
                service.processPayload(payload),
                {
                    name: 'InternalServerError',
                    message: 'Event could not be persisted'
                }
            );
        });
    });
});
