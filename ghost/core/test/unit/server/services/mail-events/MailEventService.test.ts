import assert from 'assert/strict';
import sinon from 'sinon';

import {InMemoryMailEventRepository as MailEventRepository} from '../../../../../core/server/services/mail-events/InMemoryMailEventRepository';
import {MailEvent} from '../../../../../core/server/services/mail-events/MailEvent';
import {MailEventService} from '../../../../../core/server/services/mail-events/MailEventService';

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
    let config: sinon.SinonStubbedInstance<any>;
    let labs: sinon.SinonStubbedInstance<any>;
    let service: MailEventService;

    beforeEach(function () {
        repository = sinon.createStubInstance(MailEventRepository);
        labs = {
            isSet: sinon.stub()
                .withArgs(MailEventService.LABS_KEY)
                .returns(true)
        };
        config = {
            get: sinon.stub()
                .withArgs(MailEventService.CONFIG_KEY_PAYLOAD_SIGNING_KEY)
                .returns(PAYLOAD_SIGNING_KEY)
        };
        service = new MailEventService(repository, config, labs);
    });

    describe('processPayload', function () {
        it('should reject if labs flag is false', async function () {
            labs.isSet.withArgs(MailEventService.LABS_KEY).returns(false);

            await assert.rejects(
                service.processPayload({} as any),
                {
                    name: 'NotFoundError',
                    message: 'Resource could not be found.'
                }
            );
        });

        it('should reject if payload signing key is invalid', async function () {
            config.get.withArgs(MailEventService.CONFIG_KEY_PAYLOAD_SIGNING_KEY).returns(undefined);

            await assert.rejects(
                service.processPayload({} as any),
                {
                    name: 'InternalServerError',
                    message: 'payload signing key is not configured'
                }
            );
        });

        it('should reject if payload verification fails', async function () {
            await assert.rejects(
                service.processPayload({
                    signature: 'foobarbaz',
                    mail_events: [
                        makePayloadEvent('opened')
                    ]
                } as any),
                {
                    name: 'UnauthorizedError',
                    message: '"signature" is invalid'
                }
            );
        });

        it('should store a single event', async function () {
            const payloadEvent = makePayloadEvent('opened');

            // Ensure a fixed timestamp is used so that we know the signature up front
            payloadEvent.timestamp = 1686665992511 / 1000;

            const payload = {
                signature: '9f2567330688b82759600fad93c93b3e8f571d397c33688a8620400af20b79b3',
                mail_events: [
                    payloadEvent
                ]
            };

            await service.processPayload(payload);

            const storedEvent = repository.save.getCall(0).args[0];

            assert.ok(storedEvent instanceof MailEvent);
            assert.equal(storedEvent.id, payloadEvent.id);
        });

        it('should store multiple events', async function () {
            const events = [
                makePayloadEvent('opened'),
                makePayloadEvent('opened')
            ];

            // Ensure fixed timestamps are used so that we know the signature up front
            events[0].timestamp = 1686665992511 / 1000;
            events[1].timestamp = 1686665992512 / 1000;

            const payload = {
                signature: '02959cc9731ee575b66969a508f545d19c5968b42a03fa398ce9c93d8e7df0a5',
                mail_events: events
            };

            await service.processPayload(payload);

            assert.ok(repository.save.calledTwice);
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
                mail_events: events
            };

            await service.processPayload(payload);

            assert.ok(repository.save.calledOnce);
            assert.equal(repository.save.getCall(0).args[0].type, 'opened');
        });

        it('should ensure event timestamps are converted to ms', async function () {
            const payloadEvent = makePayloadEvent('opened');

            // Ensure a fixed timestamp is used so that we know the signature up front
            payloadEvent.timestamp = 1686665992511 / 1000;

            const payload = {
                signature: '9f2567330688b82759600fad93c93b3e8f571d397c33688a8620400af20b79b3',
                mail_events: [
                    payloadEvent
                ]
            };

            await service.processPayload(payload);

            assert.ok(repository.save.calledOnce);

            const storedEvent = repository.save.getCall(0).args[0];

            assert.equal(storedEvent.timestampMs, payloadEvent.timestamp * 1000);
        });

        it('should reject if an event can not be stored', async function () {
            const payloadEvent = makePayloadEvent('opened');

            // Ensure a fixed timestamp is used so that we know the signature up front
            payloadEvent.timestamp = 1686665992511 / 1000;

            const payload = {
                signature: '9f2567330688b82759600fad93c93b3e8f571d397c33688a8620400af20b79b3',
                mail_events: [
                    payloadEvent
                ]
            };

            repository.save.rejects(new Error('foobarbaz'));

            await assert.rejects(
                service.processPayload(payload),
                {
                    name: 'InternalServerError',
                    message: 'Event could not be stored'
                }
            );
        });
    });

    describe('validatePayload', function () {
        it('should validate that the payload contains a signature', function () {
            assert.throws(
                () => service.validatePayload({} as any),
                {
                    name: 'ValidationError',
                    message: 'Payload is missing "signature"'
                }
            );
        });

        it('should validate that the payload contains a valid signature', function () {
            assert.throws(() => {
                service.validatePayload({
                    signature: {}
                } as any);
            }, {
                name: 'ValidationError',
                message: '"signature" is invalid'
            });
        });

        it('should validate that the payload contains events', function () {
            assert.throws(() => {
                service.validatePayload({
                    signature: 'foobarbaz'
                } as any);
            }, {
                name: 'ValidationError',
                message: 'Payload is missing "mail_events"'
            });
        });

        it('should validate that the payload contains valid events', function () {
            assert.throws(() => {
                service.validatePayload({
                    signature: 'foobarbaz',
                    mail_events: {}
                } as any);
            }, {
                name: 'ValidationError',
                message: '"mail_events" is not an array'
            });
        });

        it('should validate that events in the payload have an id', function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.id;

            const payload = {
                signature: 'foobarbaz',
                mail_events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };

            assert.throws(
                () => service.validatePayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "id"'
                }
            );
        });

        it('should validate that events in the payload have an timestamp', function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.timestamp;

            const payload = {
                signature: 'foobarbaz',
                mail_events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };

            assert.throws(
                () => service.validatePayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "timestamp"'
                }
            );
        });

        it('should validate that events in the payload have an event', function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.event;

            const payload = {
                signature: 'foobarbaz',
                mail_events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };

            assert.throws(
                () => service.validatePayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "event"'
                }
            );
        });

        it('should validate that events in the payload have a message', function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.message;

            const payload = {
                signature: 'foobarbaz',
                mail_events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };

            assert.throws(
                () => service.validatePayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "message"'
                }
            );
        });

        it('should validate that events in the payload have a recipient', function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.recipient;

            const payload = {
                signature: 'foobarbaz',
                mail_events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };

            assert.throws(
                () => service.validatePayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "recipient"'
                }
            );
        });

        it('should validate that "message.headers.message-id" is present on an event', function () {
            const malformedPayloadEvent = makePayloadEvent('opened') as any;
            delete malformedPayloadEvent.message.headers;

            const payload = {
                signature: 'foobarbaz',
                mail_events: [
                    makePayloadEvent('opened'),
                    malformedPayloadEvent
                ]
            };

            assert.throws(
                () => service.validatePayload(payload),
                {
                    name: 'ValidationError',
                    message: 'Event [1] is missing "message.headers.message-id"'
                }
            );
        });
    });
});
