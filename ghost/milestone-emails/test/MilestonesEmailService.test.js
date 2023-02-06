const assert = require('assert');
const {
    MilestonesEmailService,
    MilestonesAPI,
    InMemoryMilestoneRepository
} = require('../index');

describe('MilestonesEmailService', function () {
    let repository;
    let api;

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

    describe('runARRQueries', function () {
        it('Adds first ARR milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository();
            api = new MilestonesAPI({repository});

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                api,
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

            const arrResult = await milestoneEmailService.runARRQueries();
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 1000);
            assert(arrResult.emailSentAt !== null);
        });

        it('Adds next ARR milestone and sends email', async function () {
            repository = new InMemoryMilestoneRepository();
            api = new MilestonesAPI({repository});

            await api.checkAndProcessMilestone({
                type: 'arr',
                value: 1000, // intentionally skipping one milestone
                currency: 'usd'
            });

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                api,
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

            const arrResult = await milestoneEmailService.runARRQueries();
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 50000);
            assert(arrResult.emailSentAt !== null);
        });

        it('Does not add ARR milestone for out of scope currency', async function () {
            repository = new InMemoryMilestoneRepository();
            api = new MilestonesAPI({repository});

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                api,
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

            const arrResult = await milestoneEmailService.runARRQueries();
            assert(arrResult === undefined);
        });
        it('Does not add new ARR milestone if already achieved', async function () {
            repository = new InMemoryMilestoneRepository();
            api = new MilestonesAPI({repository});

            await api.checkAndProcessMilestone({
                type: 'arr',
                value: 5000,
                currency: 'gbp'
            });

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                api,
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

            const arrResult = await milestoneEmailService.runARRQueries();
            assert(arrResult === undefined);
        });

        it('Adds ARR milestone but not send email if imported members are detected', async function () {
            repository = new InMemoryMilestoneRepository();
            api = new MilestonesAPI({repository});

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                api,
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

            const arrResult = await milestoneEmailService.runARRQueries();
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'usd');
            assert(arrResult.value === 100000);
            assert(arrResult.emailSentAt === null);
        });

        it('Adds ARR milestone but not send email if last email was too recent', async function () {
            repository = new InMemoryMilestoneRepository();
            api = new MilestonesAPI({repository});

            const lessThanTwoWeeksAgo = new Date();
            lessThanTwoWeeksAgo.setDate(lessThanTwoWeeksAgo.getDate() - 12);

            await api.checkAndProcessMilestone({
                type: 'arr',
                value: 1000,
                currency: 'idr',
                emailSentAt: lessThanTwoWeeksAgo
            });

            const milestoneEmailService = new MilestonesEmailService({
                repository,
                api,
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

            const arrResult = await milestoneEmailService.runARRQueries();
            assert(arrResult.type === 'arr');
            assert(arrResult.currency === 'idr');
            assert(arrResult.value === 10000);
            assert(arrResult.emailSentAt === null);
        });
    });
    describe.skip('runMemberQueries', function () {
        it('Adds first Members milestone and sends email');
        it('Does not add new Members milestone if already achieved');
        it('Does not add Members milestone but not send email if imported members are detected');
    });
});
