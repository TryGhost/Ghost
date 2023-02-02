const assert = require('assert');
const ObjectID = require('bson-objectid');
const InMemoryMilestoneRepository = require('../lib/InMemoryMilestoneRepository');
const Milestone = require('../lib/Milestone');

describe('InMemoryMilestoneRepository', function () {
    let repository;

    before(async function () {
        const resourceId = new ObjectID();
        repository = new InMemoryMilestoneRepository();
        const milestoneCreatePromises = [];

        const validInputs = [
            {
                type: 'arr',
                value: 20000,
                createdAt: '2023-01-01T00:00:00Z',
                id: resourceId
            },
            {
                type: 'arr',
                value: 50000,
                createdAt: '2023-02-01T01:00:00Z',
                emailSentAt: '2023-02-01T01:00:00Z',
                currency: 'usd'
            },
            {
                type: 'arr',
                value: 60000,
                createdAt: '2023-02-01T01:00:00Z',
                emailSentAt: '2023-02-01T01:00:00Z',
                currency: 'usd'
            },
            {
                type: 'members',
                value: 100,
                createdAt: '2023-01-01T00:00:00Z',
                emailSentAt: '2023-01-01T00:00:00Z',
                id: resourceId
            },
            {
                type: 'members',
                value: 500,
                createdAt: '2023-02-01T00:00:00Z',
                emailSentAt: '2023-02-01T00:00:00Z'
            },
            {
                type: 'members',
                value: 600,
                createdAt: '2023-02-01T00:00:00Z',
                emailSentAt: '2023-02-01T00:00:00Z'
            }
        ];

        validInputs.forEach(validInput => milestoneCreatePromises.push(Milestone.create(validInput)));

        const milestones = await Promise.all(milestoneCreatePromises);

        for (const milestone of milestones) {
            await repository.save(milestone);
        }
    });

    it('Can return the latest milestone for members', async function () {
        const latestMemberCountMilestone = await repository.getLatestByType('members');
        const timeDiff = new Date(latestMemberCountMilestone.createdAt) - new Date('2023-02-01T00:00:00.000Z');
        assert(timeDiff === 0);
        assert(latestMemberCountMilestone.type === 'members');
        assert(latestMemberCountMilestone.value === 600);
    });

    it('Can return the latest milestone for ARR', async function () {
        const latestArrMilestone = await repository.getLatestByType('arr');
        const timeDiff = new Date(latestArrMilestone.createdAt) - new Date('2023-02-01T01:00:00Z');
        assert(timeDiff === 0);
        assert(latestArrMilestone.value === 60000);
        assert(latestArrMilestone.type = 'arr');
    });

    it('Can return the last sent email', async function () {
        const lastEmailSentMilestone = await repository.getLastEmailSent();
        const timeDiff = new Date(lastEmailSentMilestone.emailSentAt) - new Date('2023-02-01T01:00:00Z');
        assert(timeDiff === 0);
    });

    it('Can return the ARR milestone for a given value', async function () {
        const arrMilestoneForValue = await repository.getByARR(50000, 'usd');
        const timeDiff = new Date(arrMilestoneForValue.createdAt) - new Date('2023-02-01T01:00:00Z');
        assert(timeDiff === 0);
        assert(arrMilestoneForValue.type === 'arr');
        assert(arrMilestoneForValue.value === 50000);
        assert(arrMilestoneForValue.currency === 'usd');
        assert(arrMilestoneForValue.name === 'arr-50000-usd');
    });

    it('Can return the Members count milestone for a given value', async function () {
        const membersCountForValue = await repository.getByCount(100);
        const timeDiff = new Date(membersCountForValue.createdAt) - new Date('2023-01-01T00:00:00Z');
        assert(timeDiff === 0);
        assert(membersCountForValue.type === 'members');
        assert(membersCountForValue.value === 100);
        assert(membersCountForValue.name === 'members-100');
    });
});
