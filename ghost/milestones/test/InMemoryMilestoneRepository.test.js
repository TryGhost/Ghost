const assert = require('assert/strict');
const ObjectID = require('bson-objectid');
const InMemoryMilestoneRepository = require('../lib/InMemoryMilestoneRepository');
const Milestone = require('../lib/Milestone');
const DomainEvents = require('@tryghost/domain-events');
const sinon = require('sinon');

describe('InMemoryMilestoneRepository', function () {
    let repository;
    let domainEventsSpy;

    before(async function () {
        const resourceId = new ObjectID();
        domainEventsSpy = sinon.spy(DomainEvents, 'dispatch');
        repository = new InMemoryMilestoneRepository({DomainEvents});
        const milestoneCreatePromises = [];

        const validInputs = [
            {
                type: 'arr',
                value: 20000,
                createdAt: '2023-01-01T00:00:00Z',
                id: resourceId // duplicate id
            },
            {
                type: 'arr',
                value: 1000,
                createdAt: '2023-01-01T00:00:00Z',
                currency: 'gbp'
            },
            {
                type: 'arr',
                value: 2000,
                createdAt: '2023-01-30T00:00:00Z',
                currency: 'gbp'
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
                id: resourceId // duplicate id
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

    after(function () {
        sinon.restore();
    });

    it('Can dispatch events when saving a new Milestone', async function () {
        assert(domainEventsSpy.callCount === 6);
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
        assert(latestArrMilestone.currency === 'usd');
    });

    it('Can return the latest milestone for ARR for a specific currency', async function () {
        const latestArrMilestone = await repository.getLatestByType('arr', 'gbp');
        const timeDiff = new Date(latestArrMilestone.createdAt) - new Date('2023-01-30T00:00:00Z');
        assert(timeDiff === 0);
        assert(latestArrMilestone.value === 2000);
        assert(latestArrMilestone.type = 'arr');
        assert(latestArrMilestone.currency === 'gbp');
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

    it('Can return all achieved milestones by type', async function () {
        const allArrUSDMilestones = await repository.getAllByType('arr');

        assert(allArrUSDMilestones.length === 2);

        const allArrGBPMilestones = await repository.getAllByType('arr', 'gbp');

        assert(allArrGBPMilestones.length === 2);

        const allMembersMilestones = await repository.getAllByType('members');

        assert(allMembersMilestones.length === 3);
    });
});
