const {knex} = require('../../../core/server/data/db');
const migration = require('../../../core/server/data/migrations/versions/4.39/2022-03-10-09-58-fixup-member-status-events');
const {Member} = require('../../../core/server/models/member');
const {MemberStatusEvent} = require('../../../core/server/models/member-status-event');
const testUtils = require('../../utils');
const should = require('should');
const {v4: uuidv4} = require('uuid');
const sinon = require('sinon');

async function createMember(data) {
    return await Member.add({
        email: `random-email${Date.now()}-${Math.floor(Math.random() * 99999)}@example.com`,
        ...data
    }, {});
}

async function createEvent(data) {
    return await MemberStatusEvent.add({
        member_id: data.member_id,
        from_status: data.from_status,
        to_status: data.to_status,
        created_at: data.created_at
    }, {});
}

async function clearEvents() {
    await knex('members_status_events').delete();
}

async function assertEventExist(id, exists = true) {
    const s = should(await new MemberStatusEvent({id}).fetch({
        require: false
    }));
    if (exists) {
        return s.not.eql(null);
    }
    return s.eql(null);
}

async function refreshEvents(events) {
    return Promise.all(
        events.map(
            e => (
                e === null 
                    ? null 
                    : new MemberStatusEvent({id: e.id}).fetch({
                        require: false
                    })
            )
        )
    );
}

describe('Fixup member status events', function () {
    before(async function () {
        await testUtils.startGhost();

        if (process.env.NODE_ENV !== 'testing-mysql') {
            this.skip();
        }

        // Stub onValidate (because we'll need to create events with the invalid status 'unknown')
        // @ts-ignore
        sinon.stub(MemberStatusEvent.prototype, 'onValidate').returns(Promise.resolve());
    });

    describe('deleteUnchangedEvents', function () {
        it('deletes multiple unchanged events', async function () {
            const created_at = new Date();
            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: 'free', to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: 'paid', to_status: 'paid', created_at});

            should(await migration.deleteUnchangedEvents(knex)).eql(2);

            // Check both have been deleted
            await assertEventExist(event1.id, false);
            await assertEventExist(event2.id, false);
        });
    });

    describe('deleteDuplicateEvents', function () {
        it('does delete duplicate events', async function () {
            const created_at = new Date();
            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at});

            should(await migration.deleteDuplicateEvents(knex)).eql(1);

            // Check if event with lowest id has been deleted
            if (event1.id > event2.id) {
                await assertEventExist(event2.id, false);
                await assertEventExist(event1.id, true);
            } else {
                await assertEventExist(event1.id, false);
                await assertEventExist(event2.id, true);
            }
        });

        it('does not delete duplicate events from different members', async function () {
            const created_at = new Date();
            const member = await createMember({});
            const member2 = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member2.id, from_status: 'comped', to_status: 'free', created_at});

            should(await migration.deleteDuplicateEvents(knex)).eql(0);

            // Check if no event has been deleted
            await assertEventExist(event2.id, true);
            await assertEventExist(event1.id, true);
        });

        it('does not delete duplicate events with different timestamps', async function () {
            const created_at = new Date();
            const created_at_2 = new Date(created_at.getTime() - 2000);
            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at: created_at_2});

            should(await migration.deleteDuplicateEvents(knex)).eql(0);

            // Check if no event has been deleted
            await assertEventExist(event2.id, true);
            await assertEventExist(event1.id, true);
        });

        it('does not delete events with different statuses', async function () {
            const created_at = new Date();
            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at});

            should(await migration.deleteDuplicateEvents(knex)).eql(0);

            // Check if no event has been deleted
            await assertEventExist(event2.id, true);
            await assertEventExist(event1.id, true);
        });

        it('does delete duplicate events with NULL from_status', async function () {
            const created_at = new Date();
            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at});

            should(await migration.deleteDuplicateEvents(knex)).eql(1);

            // Check if event with lowest id has been deleted
            if (event1.id > event2.id) {
                await assertEventExist(event2.id, false);
                await assertEventExist(event1.id, true);
            } else {
                await assertEventExist(event1.id, false);
                await assertEventExist(event2.id, true);
            }
        });
    });

    describe('eliminateWrongNullOrdering', function () {
        it('updates created_at in case of wrong null ordering', async function () {
            // Don't use new Date() here because MySQL doesn't save ms, and we'll loose that precision
            const created_at = new Date(2000, 0, 1, 12, 0);
            const created_at_past = new Date(created_at.getTime() - 10000);

            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: 'free', to_status: 'paid', created_at: created_at_past});

            should(await migration.eliminateWrongNullOrdering(knex)).eql(1);

            // Check if both created_at timestamps are now created_at
            await Promise.all([event1.refresh(), event2.refresh()]);

            event2.get('created_at').should.eql(event1.get('created_at'));
            event2.get('created_at').should.eql(created_at);
        });

        it('updates created_at in case of wrong null ordering with 3 events', async function () {
            // Don't use new Date() here because MySQL doesn't save ms, and we'll loose that precision
            const created_at = new Date(2000, 0, 1, 12, 0);
            const created_at_past = new Date(created_at.getTime() - 10000);
            const created_at_past_2 = new Date(created_at.getTime() - 20000);

            const member = await createMember({});
            const event1 = await createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at});
            const event2 = await createEvent({member_id: member.id, from_status: 'free', to_status: 'paid', created_at: created_at_past});
            const event3 = await createEvent({member_id: member.id, from_status: 'comped', to_status: 'free', created_at: created_at_past_2});

            should(await migration.eliminateWrongNullOrdering(knex)).eql(2);

            // Check if both created_at timestamps are now created_at
            await Promise.all([event1.refresh(), event2.refresh(), event3.refresh()]);

            event2.get('created_at').should.eql(event1.get('created_at'));
            event2.get('created_at').should.eql(event3.get('created_at'));
            event2.get('created_at').should.eql(created_at);
        });
    });

    describe('mergeTwoEvents', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({});
            member2 = await createMember({});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('only merges two events for the same member at the same time', async function () {
            // Note: we need to use correctly sorted ID's here because the ID's affect
            // which events will get deleted
            const sortedIds = [
                uuidv4(),
                uuidv4(),
                uuidv4(),
                uuidv4(),
                uuidv4(),
                uuidv4()
            ].sort().reverse();

            const events = await Promise.all([
                createEvent({id: sortedIds.shift(), member_id: member.id, from_status: null, to_status: 'free', created_at}),
                createEvent({id: sortedIds.shift(), member_id: member.id, from_status: 'free', to_status: 'paid', created_at}),
                createEvent({id: sortedIds.shift(), member_id: member.id, from_status: 'paid', to_status: 'comped', created_at}),
                createEvent({id: sortedIds.shift(), member_id: member.id, from_status: 'comped', to_status: 'paid', created_at}),

                // Different timestamp
                createEvent({id: sortedIds.shift(), member_id: member.id, from_status: 'free', to_status: 'paid', created_at: created_at_past}),
                createEvent({id: sortedIds.shift(), member_id: member.id, from_status: 'paid', to_status: 'free', created_at: created_at_past})
            ]);

            // Was able to do two merges for the same member (because they had different timestamps)
            should(await migration.mergeTwoEvents(knex)).eql(4);

            const refreshed = (await refreshEvents(events));
            should(refreshed).match([
                null,
                {id: events[1].id, attributes: {from_status: null, to_status: 'paid'}},
                {id: events[2].id},
                {id: events[3].id},

                // Both deleted, because (free -> paid) (paid -> free) became (free -> free) and got deleted
                null,
                null
            ]);

            should(await migration.mergeTwoEvents(knex)).eql(2);
            const refreshed2 = (await refreshEvents(refreshed));
            should(refreshed2).match([
                null,
                null,
                {id: events[2].id, attributes: {from_status: null, to_status: 'comped'}},
                {id: events[3].id},

                // Both deleted, because (free -> paid) (paid -> free) became (free -> free) and got deleted
                null,
                null
            ]);

            should(await migration.mergeTwoEvents(knex)).eql(2);
            const refreshed3 = (await refreshEvents(refreshed2));
            should(refreshed3).match([
                null,
                null,
                null,
                {id: events[3].id, attributes: {from_status: null, to_status: 'paid'}},

                // Both deleted, because (free -> paid) (paid -> free) became (free -> free) and got deleted
                null,
                null
            ]);
        });

        it('does not merge two events with different created_at', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'free', to_status: 'paid', created_at: created_at_past})
            ]);

            should(await migration.mergeTwoEvents(knex)).eql(0);
        });

        it('does not merge events of different members', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at}),
                createEvent({member_id: member2.id, from_status: 'free', to_status: 'paid', created_at})
            ]);

            should(await migration.mergeTwoEvents(knex)).eql(0);
        });

        it('does not merge events that do not match', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: 'free', to_status: 'paid', created_at}),
                createEvent({member_id: member.id, from_status: 'comped', to_status: 'paid', created_at})
            ]);

            should(await migration.mergeTwoEvents(knex)).eql(0);
        });

        it('only merges two events', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: 'free', to_status: 'paid', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'comped', created_at})
            ]);

            // It will merge two events (depending on the uuids), after that no merge is possible
            should(await migration.mergeTwoEvents(knex)).eql(2);
            should(await migration.mergeTwoEvents(knex)).eql(0);
        });
    });

    describe('mergeEventsWithSameFromStatus', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({});
            member2 = await createMember({});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('merges multiple events', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'comped', created_at})
            ]);

            should(await migration.mergeEventsWithSameFromStatus(knex)).eql(3);
            const f = (await refreshEvents(events)).filter(e => e !== null);
            f.length.should.eql(1);
            const mergedInto = f[0];
            mergedInto.should.match({
                attributes: {
                    from_status: 'paid',
                    to_status: 'unknown'
                }
            });
        });

        it('does not merge for different members', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member2.id, from_status: 'paid', to_status: 'comped', created_at})
            ]);

            should(await migration.mergeEventsWithSameFromStatus(knex)).eql(0);
        });

        it('does not merge for different timestamps', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'comped', created_at: created_at_past})
            ]);

            should(await migration.mergeEventsWithSameFromStatus(knex)).eql(0);
        });
    });

    describe('mergeEventsWithSameToStatus', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({});
            member2 = await createMember({});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('merges multiple events', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'free', created_at}),
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'free', created_at}),
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'comped', created_at})
            ]);

            should(await migration.mergeEventsWithSameToStatus(knex)).eql(3);
            const f = (await refreshEvents(events)).filter(e => e !== null);
            f.length.should.eql(1);
            const mergedInto = f[0];
            mergedInto.should.match({
                attributes: {
                    to_status: 'paid',
                    from_status: 'unknown'
                }
            });
        });

        it('does not merge for different members', async function () {
            await Promise.all([
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'free', created_at}),
                createEvent({member_id: member2.id, to_status: 'paid', from_status: 'comped', created_at})
            ]);

            should(await migration.mergeEventsWithSameToStatus(knex)).eql(0);
        });

        it('does not merge for different timestamps', async function () {
            await Promise.all([
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'free', created_at}),
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'comped', created_at: created_at_past})
            ]);

            should(await migration.mergeEventsWithSameToStatus(knex)).eql(0);
        });
    });

    describe('mergeEventsWithSameTime', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({});
            member2 = await createMember({});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('merges multiple events', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, to_status: null, from_status: 'free', created_at}),
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'comped', created_at})
            ]);

            should(await migration.mergeEventsWithSameTime(knex)).eql(2);
            const f = (await refreshEvents(events)).filter(e => e !== null);
            f.length.should.eql(1);
            const mergedInto = f[0];
            mergedInto.should.match({
                attributes: {
                    to_status: 'unknown',
                    from_status: 'unknown'
                }
            });
        });

        it('does not merge for different members', async function () {
            await Promise.all([
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'free', created_at}),
                createEvent({member_id: member2.id, to_status: 'paid', from_status: 'comped', created_at})
            ]);

            should(await migration.mergeEventsWithSameTime(knex)).eql(0);
        });

        it('does not merge for different timestamps', async function () {
            await Promise.all([
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'free', created_at}),
                createEvent({member_id: member.id, to_status: 'paid', from_status: 'comped', created_at: created_at_past})
            ]);

            should(await migration.mergeEventsWithSameTime(knex)).eql(0);
        });
    });

    describe('linkIncorrectEvents', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_next = new Date(created_at.getTime() + 10000);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({});
            member2 = await createMember({});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('update to_status', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'comped', created_at: created_at_next})
            ]);

            should(await migration.linkIncorrectEvents(knex, 'to_status')).eql(2);
            (await refreshEvents(events)).should.match([
                {attributes: {from_status: null, to_status: 'paid'}},
                null, // became paid -> paid
                {attributes: {from_status: 'paid', to_status: 'comped'}}
            ]);
        });

        it('update from_status', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'comped', created_at: created_at_next})
            ]);

            should(await migration.linkIncorrectEvents(knex, 'from_status')).eql(2);
            (await refreshEvents(events)).should.match([
                {attributes: {from_status: null, to_status: 'free'}},
                null, // became free -> free
                {attributes: {from_status: 'free', to_status: 'comped'}}
            ]);
        });

        it('never update to_status to unknown', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'unknown', to_status: 'paid', created_at})
            ]);

            should(await migration.linkIncorrectEvents(knex, 'to_status')).eql(0);
        });

        it('never update from_status to unknown', async function () {
            await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'unknown', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'free', to_status: 'paid', created_at})
            ]);

            should(await migration.linkIncorrectEvents(knex, 'from_status')).eql(0);
        });
    });

    describe('fixLastStatus', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({status: 'comped'});
            member2 = await createMember({status: 'free'});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('update to current member status', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, from_status: null, to_status: 'free', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member2.id, from_status: null, to_status: 'paid', created_at})
            ]);

            should(await migration.fixLastStatus(knex)).eql(2);
            (await refreshEvents(events)).should.match([
                {attributes: {from_status: null, to_status: 'free'}},
                {attributes: {from_status: 'paid', to_status: 'comped'}},
                {attributes: {from_status: null, to_status: 'free'}}
            ]);
        });
    });

    describe('fixFirstStatus', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({status: 'comped'});
            member2 = await createMember({status: 'free'});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('update first events to NULL', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, from_status: 'unknown', to_status: 'free', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'free', created_at}),
                createEvent({member_id: member2.id, from_status: 'free', to_status: 'paid', created_at})
            ]);

            should(await migration.fixFirstStatus(knex)).eql(2);
            (await refreshEvents(events)).should.match([
                {attributes: {from_status: null, to_status: 'free'}},
                {attributes: {from_status: 'paid', to_status: 'free'}},
                {attributes: {from_status: null, to_status: 'paid'}}
            ]);
        });
    });

    describe('replaceUnknownStatuses', function () {
        let member, member2;
        const created_at = new Date(2000, 0, 1, 12, 0);
        const created_at_past = new Date(created_at.getTime() - 10000);

        before(async function () {
            member = await createMember({status: 'comped'});
            member2 = await createMember({status: 'free'});
        });

        beforeEach(async function () {
            await clearEvents();
        });

        it('update unknown to free', async function () {
            const events = await Promise.all([
                createEvent({member_id: member.id, from_status: 'unknown', to_status: 'paid', created_at: created_at_past}),
                createEvent({member_id: member.id, from_status: 'paid', to_status: 'unknown', created_at}),
                createEvent({member_id: member2.id, from_status: 'unknown', to_status: 'unknown', created_at})
            ]);

            should(await migration.replaceUnknownStatuses(knex, 'free')).eql(4);
            (await refreshEvents(events)).should.match([
                {attributes: {from_status: 'free', to_status: 'paid'}},
                {attributes: {from_status: 'paid', to_status: 'free'}},
                null // updated to free -> free
            ]);
        });
    });
});