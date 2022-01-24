const should = require('should');
const EventRepository = require('../../../../lib/repositories/event');
const errors = require('@tryghost/errors');

describe('EventRepository', function () {
    describe('getNQLSubset', function () {
        let eventRepository;

        before(function () {
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null
            });
        });

        it('throws when processing a filter with parenthesis', function () {
            should.throws(() => {
                eventRepository.getNQLSubset('(type:1)');
            }, errors.IncorrectUsageError);
            should.throws(() => {
                eventRepository.getNQLSubset('type:1+(data.created_at:1+data.member_id:1)');
            }, errors.IncorrectUsageError);
        });

        it('throws when using properties that aren\'t in the allowlist', function () {
            should.throws(() => {
                eventRepository.getNQLSubset('(types:1)');
            }, errors.IncorrectUsageError);
        });

        it('throws when using an OR', function () {
            should.throws(() => {
                eventRepository.getNQLSubset('type:1,data.created_at:1');
            }, errors.IncorrectUsageError);

            should.throws(() => {
                eventRepository.getNQLSubset('type:1+data.created_at:1,data.member_id:1');
            }, errors.IncorrectUsageError);

            should.throws(() => {
                eventRepository.getNQLSubset('type:1,data.created_at:1+data.member_id:1');
            }, errors.IncorrectUsageError);
        });

        it('passes when using it correctly with one filter', function () {
            const res = eventRepository.getNQLSubset('type:email_delivered_event');
            res.should.be.an.Object();
            res.should.deepEqual({
                type: 'type:email_delivered_event'
            });
        });

        it('passes when using it correctly with multiple filters', function () {
            const res = eventRepository.getNQLSubset('type:-[email_delivered_event,email_opened_event,email_failed_event]+data.created_at:<0+data.member_id:123');
            res.should.be.an.Object();
            res.should.deepEqual({
                'data.created_at': 'data.created_at:<0',
                'data.member_id': 'data.member_id:123',
                type: 'type:-[email_delivered_event,email_opened_event,email_failed_event]'
            });
        });

        it('passes when using it correctly with multiple filters used several times', function () {
            const res = eventRepository.getNQLSubset('type:-email_delivered_event+data.created_at:<0+data.member_id:123+type:-[email_opened_event,email_failed_event]+data.created_at:>10');
            res.should.be.an.Object();
            res.should.deepEqual({
                'data.created_at': 'data.created_at:<0+data.created_at:>10',
                'data.member_id': 'data.member_id:123',
                type: 'type:-email_delivered_event+type:-[email_opened_event,email_failed_event]'
            });
        });
    });
});
