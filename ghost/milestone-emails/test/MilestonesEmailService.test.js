const assert = require('assert');
const {
    MilestonesEmailService,
    InMemoryMilestoneRepository
} = require('../index');
const Milestone = require('../lib/Milestone');

describe('MilestonesEmailService', function () {
    let repository;

    const milestoneConfig = {
        milestones:
        {
            arr: [
                {
                    currency: 'usd',
                    values: [1000, 10000, 50000, 100000, 250000, 500000, 1000000]
                },
                {
                    currency: 'gbp',
                    values: [500, 1000, 5000, 100000, 250000, 500000, 1000000]
                },
                {
                    currency: 'idr',
                    values: [1000, 10000, 50000, 100000, 250000, 500000, 1000000]
                }
            ],
            members: [100, 1000, 10000, 50000, 100000, 250000, 500000, 1000000]
        }
    };

    describe('ARR Milestones', function () {
        it('Adds first ARR milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'usd', arr: 1298}, {currency: 'gbp', arr: 2600}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                },
                defaultCurrency: 'usd'
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 1000);
            assert(arrResult.emailSentAt !== null);
            assert(arrResult.name === 'arr-1000-usd');
        });

        it('Adds next ARR milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestoneOne = await Milestone.create({
                type: 'arr',
                value: 1000,
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
                currency: 'aud',
                createdAt: '2023-01-15T00:00:00Z',
                emailSentAt: '2023-01-15T00:00:00Z'
            });

            await repository.save(milestoneOne);
            await repository.save(milestoneTwo);
            await repository.save(milestoneThree);

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'usd', arr: 50005}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                },
                defaultCurrency: 'usd'
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 50000);
            assert(arrResult.emailSentAt !== null);
            assert(arrResult.name === 'arr-50000-usd');
        });

        it('Does not add ARR milestone for out of scope currency', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                // TODO: make this a stub
                mailer: {
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'nzd', arr: 1005}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                },
                defaultCurrency: 'nzd'
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult === undefined);
        });

        it('Does not add new ARR milestone if already achieved', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestone = await Milestone.create({
                type: 'arr',
                value: 5000,
                currency: 'gbp'
            });

            await repository.save(milestone);

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'gbp', arr: 5005}];
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                },
                defaultCurrency: 'gbp'
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult === undefined);
        });

        it('Adds ARR milestone but does not send email if imported members are detected', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'usd', arr: 100000}, {currency: 'idr', arr: 2600}];
                    },
                    async hasImportedMembersInPeriod() {
                        return true;
                    }
                },
                defaultCurrency: 'usd'
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 100000);
            assert(arrResult.emailSentAt === null);
        });

        it('Adds ARR milestone but does not send email if last email was too recent', async function () {
            repository = new InMemoryMilestoneRepository();

            const lessThanTwoWeeksAgo = new Date();
            lessThanTwoWeeksAgo.setDate(lessThanTwoWeeksAgo.getDate() - 12);

            const milestone = await Milestone.create({
                type: 'arr',
                value: 1000,
                currency: 'idr',
                emailSentAt: lessThanTwoWeeksAgo
            });

            await repository.save(milestone);

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getARR() {
                        return [{currency: 'idr', arr: 10000}];
                    },
                    async hasImportedMembersInPeriod() {
                        return true;
                    }
                },
                defaultCurrency: 'idr'
            });

            const arrResult = await milestoneEmailService.checkMilestones('arr');
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'idr');
            assert(arrResult.value === 10000);
            assert(arrResult.emailSentAt === null);
        });
    });

    describe('Members Milestones', function () {
        it('Adds first Members milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getMembersCount() {
                        return 110;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 100);
            assert(membersResult.emailSentAt !== null);
        });

        it('Adds next Members milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository();

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

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getMembersCount() {
                        return 50005;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                },
                defaultCurrency: 'usd'
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.currency === null);
            assert(membersResult.value === 50000);
            assert(membersResult.emailSentAt !== null);
            assert(membersResult.name === 'members-50000');
        });

        it('Does not add new Members milestone if already achieved', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestone = await Milestone.create({
                type: 'members',
                value: 50000
            });

            await repository.save(milestone);

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getMembersCount() {
                        return 50555;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult === undefined);
        });

        it('Adds Members milestone but does not send email if imported members are detected', async function () {
            repository = new InMemoryMilestoneRepository();

            const milestone = await Milestone.create({
                type: 'members',
                value: 100
            });

            await repository.save(milestone);

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getMembersCount() {
                        return 1001;
                    },
                    async hasImportedMembersInPeriod() {
                        return true;
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 1000);
            assert(membersResult.emailSentAt === null);
        });

        it('Adds Members milestone but does not send email if last email was too recent', async function () {
            repository = new InMemoryMilestoneRepository();

            const lessThanTwoWeeksAgo = new Date();
            lessThanTwoWeeksAgo.setDate(lessThanTwoWeeksAgo.getDate() - 8);

            const milestone = await Milestone.create({
                type: 'members',
                value: 100,
                emailSentAt: lessThanTwoWeeksAgo
            });

            await repository.save(milestone);

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                mailer: {
                    // TODO: make this a stub
                    send: async () => {}
                },
                config: milestoneConfig,
                queries: {
                    async getMembersCount() {
                        return 50010;
                    },
                    async hasImportedMembersInPeriod() {
                        return false;
                    }
                }
            });

            const membersResult = await milestoneEmailService.checkMilestones('members');
            assert(membersResult.type === 'members');
            assert(membersResult.value === 50000);
            assert(membersResult.emailSentAt === null);
        });
    });
});
