const assert = require('assert/strict');
const {
    MilestonesService,
    InMemoryMilestoneRepository
} = require('../index');
const Milestone = require('../lib/Milestone');
const DomainEvents = require('@tryghost/domain-events');
const sinon = require('sinon');

describe('MilestonesService', function () {
    let repository;
    let domainEventSpy;

    beforeEach(async function () {
        domainEventSpy = sinon.spy(DomainEvents, 'dispatch');
    });

    afterEach(function () {
        sinon.restore();
    });

    const milestonesConfig = {
        arr: [
            {
                currency: 'usd',
                values: [0, 1000, 10000, 50000, 100000, 250000, 500000, 1000000]
            },
            {
                currency: 'gbp',
                values: [0, 500, 1000, 5000, 100000, 250000, 500000, 1000000]
            },
            {
                currency: 'idr',
                values: [0, 1000, 10000, 50000, 100000, 250000, 500000, 1000000]
            },
            {
                currency: 'eur',
                values: [0, 1000, 10000, 50000, 100000, 250000, 500000, 1000000]
            }
        ],
        members: [0, 100, 1000, 10000, 50000, 100000, 250000, 500000, 1000000],
        minDaysSinceImported: 7,
        minDaysSinceLastEmail: 14
    };

    describe('ARR Milestones', function () {
        it('Adds initial 0 ARR milestone without sending email', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'usd', arr: 43}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 0);
            assert(arrResult.emailSentAt === null);
            assert(arrResult.name === 'arr-0-usd');

            const domainEventSpyResult = domainEventSpy.getCall(0).args[0];
            assert(domainEventSpy.calledOnce === true);
            assert(domainEventSpyResult.data.milestone);
            assert(domainEventSpyResult.data.meta.currentValue === 43);
            assert(domainEventSpyResult.data.meta.reason === 'initial');
        });

        it('Adds first ARR milestones but does not send email if no previous milestones', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'usd', arr: 1298}, {currency: 'nzd', arr: 600}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 1000);
            assert(arrResult.emailSentAt === null);
            assert(arrResult.name === 'arr-1000-usd');

            assert(domainEventSpy.calledTwice === true);
            const firstDomainEventSpyCall = domainEventSpy.getCall(0).args[0];
            const secondDomainEventSpyCall = domainEventSpy.getCall(1).args[0];
            assert(firstDomainEventSpyCall.data.milestone);
            assert(firstDomainEventSpyCall.data.meta.currentValue === 1298);
            assert(firstDomainEventSpyCall.data.meta.reason === 'initial');
            assert(secondDomainEventSpyCall.data.milestone);
            assert(secondDomainEventSpyCall.data.meta.currentValue === 1298);
            assert(secondDomainEventSpyCall.data.meta.reason === 'initial');
        });

        it('Adds next ARR milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneOne = await Milestone.create({
                type: 'arr',
                value: 100,
                createdAt: '2023-01-01T00:00:00Z',
                emailSentAt: '2023-01-01T00:00:00Z'
            });

            const milestoneTwo = await Milestone.create({
                type: 'arr',
                value: 500,
                createdAt: '2023-01-02T00:00:00Z',
                emailSentAt: '2023-01-02T00:00:00Z'
            });

            const milestoneThree = await Milestone.create({
                type: 'arr',
                value: 1000,
                currency: 'eur',
                createdAt: '2023-01-15T00:00:00Z',
                emailSentAt: '2023-01-15T00:00:00Z'
            });

            await repository.save(milestoneOne);
            await repository.save(milestoneTwo);
            await repository.save(milestoneThree);

            assert(domainEventSpy.callCount === 3);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        // Same ARR values for both supported currencies
                        return [{currency: 'usd', arr: 10001}, {currency: 'eur', arr: 10001}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 10000);
            assert(arrResult.emailSentAt !== null);
            assert(arrResult.name === 'arr-10000-usd');
            assert(domainEventSpy.callCount === 6); // we have just created three new milestones, but we only sent the email for the last one
            const firstDomainEventSpyResult = domainEventSpy.getCall(3).args[0];
            assert(firstDomainEventSpyResult.data.milestone);
            assert(firstDomainEventSpyResult.data.meta.reason === 'skipped');
            const secondDomainEventSpyResult = domainEventSpy.getCall(4).args[0];
            assert(secondDomainEventSpyResult.data.milestone);
            assert(secondDomainEventSpyResult.data.meta.reason === 'skipped');
            const thirdDomainEventSpyResult = domainEventSpy.getCall(5).args[0];
            assert(thirdDomainEventSpyResult.data.milestone);
            assert(thirdDomainEventSpyResult.data.meta.currentValue === 10001);
            assert(thirdDomainEventSpyResult.data.meta.reason === undefined);
        });

        it('Does not add ARR milestone for out of scope currency', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'nzd', arr: 1005}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'nzd';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult === undefined);
            assert(domainEventSpy.callCount === 0);
        });

        it('Does not add new ARR milestone if already achieved', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestone = await Milestone.create({
                type: 'arr',
                value: 5000,
                currency: 'gbp',
                emailSentAt: '2023-01-01T00:00:00Z'
            });

            await repository.save(milestone);

            assert(domainEventSpy.callCount === 1);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'gbp', arr: 5005}, {currency: 'usd', arr: 100}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'gbp';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'gbp');
            assert(arrResult.value === 5000);
            assert(arrResult.name === 'arr-5000-gbp');
            assert(domainEventSpy.callCount === 4);
            // Filled up missing milestones, but only if they don't exist already
            const firstDomainEventSpyResult = domainEventSpy.getCall(1).args[0];
            assert(firstDomainEventSpyResult.data.milestone);
            assert(firstDomainEventSpyResult.data.meta.reason === 'skipped');
            const secondDomainEventSpyResult = domainEventSpy.getCall(2).args[0];
            assert(secondDomainEventSpyResult.data.milestone);
            assert(secondDomainEventSpyResult.data.meta.reason === 'skipped');
            const thirdDomainEventSpyResult = domainEventSpy.getCall(3).args[0];
            assert(thirdDomainEventSpyResult.data.milestone);
            assert(thirdDomainEventSpyResult.data.meta.reason === 'skipped');
            assert(thirdDomainEventSpyResult.data.meta.currentValue === 5005);
        });

        it('Adds ARR milestone but does not send email if imported members are detected', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestone = await Milestone.create({
                type: 'arr',
                value: 0,
                currency: 'usd',
                emailSentAt: '2023-01-01T00:00:00Z'
            });

            await repository.save(milestone);

            assert(domainEventSpy.callCount === 1);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'usd', arr: 100000}, {currency: 'idr', arr: 2600}];
                    },
                    async hasImportedMembersInPeriod() {
                        return true;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 100000);
            assert(arrResult.emailSentAt === null);
            assert(domainEventSpy.callCount === 5);
            const secondDomainEventSpyResult = domainEventSpy.getCall(1).args[0];
            assert(secondDomainEventSpyResult.data.meta.reason === 'skipped');
            const lastDomainEventSpyResult = domainEventSpy.getCall(4).args[0];
            assert(lastDomainEventSpyResult.data.meta.reason === 'import');
        });

        it('Adds ARR milestone but does not send email if last email was too recent', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const lessThanTwoWeeksAgo = new Date();
            lessThanTwoWeeksAgo.setDate(lessThanTwoWeeksAgo.getDate() - 12);

            const milestone = await Milestone.create({
                type: 'arr',
                value: 1000,
                currency: 'idr',
                emailSentAt: lessThanTwoWeeksAgo
            });

            await repository.save(milestone);
            assert(domainEventSpy.callCount === 1);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'idr', arr: 10000}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'idr';
                    }
                }
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'idr');
            assert(arrResult.value === 10000);
            assert(arrResult.emailSentAt === null);
            assert(domainEventSpy.callCount === 3); // two new milestones created
            const lastDomainEventSpyResult = domainEventSpy.getCall(2).args[0];
            assert(lastDomainEventSpyResult.data.meta.reason === 'email');
        });
    });

    describe('Members Milestones', function () {
        it('Adds initial 0 Members milestone without sending email', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getMembersCount() {
                        return 6;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 0);
            assert(membersResult.emailSentAt === null);
            assert(membersResult.name === 'members-0');

            const domainEventSpyResult = domainEventSpy.getCall(0).args[0];
            assert(domainEventSpy.calledOnce === true);
            assert(domainEventSpyResult.data.milestone);
            assert(domainEventSpyResult.data.meta.currentValue === 6);
            assert(domainEventSpyResult.data.meta.reason === 'initial');
        });

        it('Adds first Members milestone but does not send email if no previous milestones', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getMembersCount() {
                        return 110;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 100);
            assert(membersResult.emailSentAt === null);
            assert(domainEventSpy.callCount === 2);

            assert(domainEventSpy.calledTwice === true);
            const firstDomainEventSpyCall = domainEventSpy.getCall(0).args[0];
            const secondDomainEventSpyCall = domainEventSpy.getCall(1).args[0];
            assert(firstDomainEventSpyCall.data.milestone);
            assert(firstDomainEventSpyCall.data.meta.currentValue === 110);
            assert(firstDomainEventSpyCall.data.meta.reason === 'initial');
            assert(secondDomainEventSpyCall.data.milestone);
            assert(secondDomainEventSpyCall.data.meta.currentValue === 110);
            assert(secondDomainEventSpyCall.data.meta.reason === 'initial');
        });

        it('Adds next Members milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestoneOne = await Milestone.create({
                type: 'members',
                value: 1000,
                createdAt: '2023-01-01T00:00:00Z',
                emailSentAt: '2023-01-01T00:00:00Z'
            });

            const milestoneTwo = await Milestone.create({
                type: 'members',
                value: 500,
                createdAt: '2023-01-02T00:00:00Z',
                emailSentAt: '2023-01-02T00:00:00Z'
            });

            const milestoneThree = await Milestone.create({
                type: 'members',
                value: 1000,
                createdAt: '2023-01-15T00:00:00Z',
                emailSentAt: '2023-01-15T00:00:00Z'
            });

            await repository.save(milestoneOne);
            await repository.save(milestoneTwo);
            await repository.save(milestoneThree);

            assert(domainEventSpy.callCount === 3);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getMembersCount() {
                        return 50005;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.currency === null);
            assert(membersResult.value === 50000);
            assert(membersResult.emailSentAt !== null);
            assert(membersResult.name === 'members-50000');

            assert(domainEventSpy.callCount === 7); // we have just created three new milestones, but we only sent the email for the last one
            const firstDomainEventSpyResult = domainEventSpy.getCall(3).args[0];
            assert(firstDomainEventSpyResult.data.milestone);
            assert(firstDomainEventSpyResult.data.meta.reason === 'skipped');
            const secondDomainEventSpyResult = domainEventSpy.getCall(4).args[0];
            assert(secondDomainEventSpyResult.data.milestone);
            assert(secondDomainEventSpyResult.data.meta.reason === 'skipped');
            const thirdDomainEventSpyResult = domainEventSpy.getCall(5).args[0];
            assert(thirdDomainEventSpyResult.data.milestone);
            assert(thirdDomainEventSpyResult.data.meta.reason === 'skipped');
            const fourthDomainEventSpyResult = domainEventSpy.getCall(6).args[0];
            assert(fourthDomainEventSpyResult.data.milestone);
            assert(fourthDomainEventSpyResult.data.meta.currentValue === 50005);
            assert(fourthDomainEventSpyResult.data.meta.reason === undefined);
        });

        it('Does not add new Members milestone if already achieved', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestone = await Milestone.create({
                type: 'members',
                value: 50000
            });

            await repository.save(milestone);

            assert(domainEventSpy.callCount === 1);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getMembersCount() {
                        return 50555;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 50000);
            assert(membersResult.name === 'members-50000');
            assert(domainEventSpy.callCount === 5);
            // Filled up missing milestones, but only if they don't exist already
            const firstDomainEventSpyResult = domainEventSpy.getCall(1).args[0];
            assert(firstDomainEventSpyResult.data.milestone);
            assert(firstDomainEventSpyResult.data.meta.reason === 'skipped');
            const secondDomainEventSpyResult = domainEventSpy.getCall(2).args[0];
            assert(secondDomainEventSpyResult.data.milestone);
            assert(secondDomainEventSpyResult.data.meta.reason === 'skipped');
            const thirdDomainEventSpyResult = domainEventSpy.getCall(3).args[0];
            assert(thirdDomainEventSpyResult.data.milestone);
            assert(thirdDomainEventSpyResult.data.meta.reason === 'skipped');
            assert(thirdDomainEventSpyResult.data.meta.currentValue === 50555);
            assert(thirdDomainEventSpyResult.data.meta.reason === 'skipped');
        });

        it('Adds Members milestone but does not send email if imported members are detected', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const milestone = await Milestone.create({
                type: 'members',
                value: 100
            });

            await repository.save(milestone);

            assert(domainEventSpy.callCount === 1);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getMembersCount() {
                        return 1001;
                    },
                    async hasImportedMembersInPeriod() {
                        return true;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 1000);
            assert(membersResult.emailSentAt === null);
            assert(domainEventSpy.callCount === 3);
            const lastDomainEventSpyResult = domainEventSpy.getCall(2).args[0];
            assert(lastDomainEventSpyResult.data.meta.reason === 'import');
        });

        it('Adds Members milestone but does not send email if last email was too recent', async function () {
            repository = new InMemoryMilestoneRepository({DomainEvents});

            const lessThanTwoWeeksAgo = new Date();
            lessThanTwoWeeksAgo.setDate(lessThanTwoWeeksAgo.getDate() - 8);

            const milestone = await Milestone.create({
                type: 'members',
                value: 100,
                emailSentAt: lessThanTwoWeeksAgo
            });

            await repository.save(milestone);

            assert(domainEventSpy.callCount === 1);

            const milestoneEmailService = new MilestonesService({
                repository,
                milestonesConfig,
                queries: {
                    async getMembersCount() {
                        return 50010;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    },
                    async getDefaultCurrency() {
                        return 'usd';
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 50000);
            assert(membersResult.emailSentAt === null);
            assert(domainEventSpy.callCount === 5);
            const lastDomainEventSpyResult = domainEventSpy.getCall(4).args[0];
            assert(lastDomainEventSpyResult.data.meta.reason === 'email');
        });
    });
});
