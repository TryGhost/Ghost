const assert = require('assert');
const Milestone = require('../lib/Milestone');
const MilestonesAPI = require('../lib/MilestonesAPI');
const InMemoryMilestoneRepository = require('../lib/InMemoryMilestoneRepository');
const subDays = require('date-fns/subDays');

describe('MilestonesAPI', function () {
    it('Can list the latest ARR milestone', async function () {
        const repository = new InMemoryMilestoneRepository();
        const api = new MilestonesAPI({
            repository
        });

        const milestoneOne = await api.checkAndProcessMilestone({
            type: 'arr',
            value: 100,
            createdAt: '2023-01-01T00:00:00Z',
            emailSentAt: '2023-01-01T00:00:00Z'
        });

        const milestoneTwo = await api.checkAndProcessMilestone({
            type: 'arr',
            value: 500,
            createdAt: '2023-02-01T00:00:00Z',
            emailSentAt: '2023-02-01T00:00:00Z'
        });

        assert(milestoneOne instanceof Milestone);
        assert(milestoneTwo instanceof Milestone);

        const milestone = await api.getLatestArrMilestone();

        assert.equal(milestone.id, milestoneTwo.id);
        assert(milestone.value === 500);
        assert(milestone.type === 'arr');
    });

    it('Can list the latest Member milestone', async function () {
        const repository = new InMemoryMilestoneRepository();
        const api = new MilestonesAPI({
            repository
        });

        const milestoneOne = await api.checkAndProcessMilestone({
            type: 'members',
            value: 1000,
            createdAt: '2023-01-01T00:00:00Z',
            emailSentAt: '2023-01-01T00:00:00Z'
        });

        const milestoneTwo = await api.checkAndProcessMilestone({
            type: 'members',
            value: 5000,
            createdAt: '2023-02-01T00:00:00Z',
            emailSentAt: '2023-02-01T00:00:00Z'
        });

        assert(milestoneOne instanceof Milestone);
        assert(milestoneTwo instanceof Milestone);

        const milestone = await api.getLatestMembersCountMilestone();

        assert.equal(milestone.id, milestoneTwo.id);
        assert(milestone.value === 5000);
        assert(milestone.type === 'members');
    });

    it('Will error if the milestone already exists', async function () {
        const repository = new InMemoryMilestoneRepository();
        const api = new MilestonesAPI({
            repository
        });

        let errored = false;
        try {
            await api.checkAndProcessMilestone({
                type: 'arr',
                value: 100
            });

            await api.checkAndProcessMilestone({
                type: 'arr',
                value: 100,
                currency: 'usd'
            });
        } catch (err) {
            errored = true;
        } finally {
            assert(errored);
        }

        errored = false;

        try {
            await api.checkAndProcessMilestone({
                type: 'members',
                value: 1000
            });

            await api.checkAndProcessMilestone({
                type: 'members',
                value: 1000
            });
        } catch (err) {
            errored = true;
        } finally {
            assert(errored);
        }
    });

    it('Can check if we should send an email', async function () {
        const repository = new InMemoryMilestoneRepository();
        const api = new MilestonesAPI({
            repository
        });

        const shouldSendEmailNoMilestones = await api.shouldSendEmail();

        assert(shouldSendEmailNoMilestones === true);

        const milestone = await api.checkAndProcessMilestone({
            type: 'members',
            value: 1000,
            createdAt: subDays(new Date(), 12),
            emailSentAt: subDays(new Date(), 12)
        });

        assert(milestone instanceof Milestone);

        const shouldNotSendEmail = await api.shouldSendEmail();

        assert(shouldNotSendEmail === false);

        const milestoneTwo = await api.checkAndProcessMilestone({
            type: 'members',
            value: 2000,
            createdAt: subDays(new Date(), 14),
            emailSentAt: subDays(new Date(), 14)
        });

        assert(milestoneTwo instanceof Milestone);

        const shouldSendEmail = await api.shouldSendEmail();

        assert(shouldSendEmail === true);
    });
});
