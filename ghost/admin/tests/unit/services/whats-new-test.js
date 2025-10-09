import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: whats-new', function () {
    setupTest();

    let server;
    let consoleErrorStub;

    beforeEach(function () {
        server = sinon.fakeServer.create();
        server.respondImmediately = true;
        consoleErrorStub = sinon.stub(console, 'error');
    });

    afterEach(function () {
        server.restore();
        consoleErrorStub.restore();
    });

    // User fixtures
    const USERS = {
        noWhatsNew: {
            id: '1',
            accessibility: JSON.stringify({})
        },
        oldWhatsNew: {
            id: '1',
            accessibility: JSON.stringify({
                whatsNew: {
                    lastSeenDate: '2024-01-01 00:00:00'
                }
            })
        },
        futureWhatsNew: {
            id: '1',
            accessibility: JSON.stringify({
                whatsNew: {
                    lastSeenDate: '2024-01-20 00:00:00'
                }
            })
        },
        exactMatchWhatsNew: {
            id: '1',
            accessibility: JSON.stringify({
                whatsNew: {
                    lastSeenDate: '2024-01-15 12:00:00'
                }
            })
        },
        nullAccessibility: {
            id: '1',
            accessibility: null
        },
        withOtherSettings: {
            id: '1',
            accessibility: JSON.stringify({
                someOtherSetting: 'value',
                whatsNew: {
                    lastSeenDate: '2024-01-01 00:00:00'
                }
            })
        },
        withCustomSettings: {
            id: '1',
            accessibility: JSON.stringify({
                whatsNew: {
                    lastSeenDate: '2024-01-01 00:00:00',
                    customSetting: 'value'
                }
            })
        }
    };

    // Entry fixtures
    const ENTRIES = {
        empty: [],
        newEntry: [{
            title: 'New Update',
            published_at: '2024-01-15T12:00:00.000+00:00'
        }],
        newFeaturedEntry: [{
            title: 'Featured Update',
            published_at: '2024-01-15T12:00:00.000+00:00',
            featured: true
        }],
        newNonFeaturedEntry: [{
            title: 'Regular Update',
            published_at: '2024-01-15T12:00:00.000+00:00',
            featured: false
        }],
        oldEntry: [{
            title: 'Old Update',
            published_at: '2018-12-01T12:00:00.000+00:00'
        }],
        oldFeaturedEntry: [{
            title: 'Old Featured Update',
            published_at: '2018-12-01T12:00:00.000+00:00',
            featured: true
        }],
        multipleEntries: [
            {
                title: 'Latest Update',
                published_at: '2024-01-15T12:00:00.000+00:00'
            },
            {
                title: 'Previous Update',
                published_at: '2024-01-10T12:00:00.000+00:00'
            }
        ]
    };

    function setupService(context, {user, entries}) {
        const service = context.owner.lookup('service:whats-new');
        const sessionService = context.owner.lookup('service:session');

        // Set up user in session
        sessionService.set('user', user);

        // Set up server response
        server.respondWith('GET', 'https://ghost.org/changelog.json', [
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify({
                posts: entries,
                changelogUrl: 'https://ghost.org/changelog/'
            })
        ]);

        return service;
    }

    function createMockUser(baseUser) {
        return {
            ...baseUser,
            set: sinon.spy(),
            save: sinon.stub().resolves()
        };
    }

    describe('fetchLatest', function () {
        it('fetches and stores changelog entries', async function () {
            const service = setupService(this, {
                user: USERS.oldWhatsNew,
                entries: [{
                    title: 'Test Update',
                    published_at: '2024-01-15T12:00:00.000+00:00',
                    url: 'https://ghost.org/changelog/test',
                    featured: true
                }]
            });

            await service.fetchLatest.perform();

            expect(service.entries.length).to.equal(1);
            expect(service.entries[0].title).to.equal('Test Update');
            expect(service.changelogUrl).to.equal('https://ghost.org/changelog/');
        });

        it('only fetches changelog once', async function () {
            const service = this.owner.lookup('service:whats-new');
            const sessionService = this.owner.lookup('service:session');

            sessionService.set('user', USERS.oldWhatsNew);

            let requestCount = 0;
            server.respondWith('GET', 'https://ghost.org/changelog.json', function (request) {
                requestCount = requestCount + 1;
                request.respond(200, {'Content-Type': 'application/json'}, JSON.stringify({
                    posts: ENTRIES.newEntry,
                    changelogUrl: 'https://ghost.org/changelog/'
                }));
            });

            await service.fetchLatest.perform();
            await service.fetchLatest.perform();
            await service.fetchLatest.perform();

            expect(requestCount).to.equal(1);
        });

        it('handles empty changelog response', async function () {
            const service = setupService(this, {
                user: USERS.noWhatsNew,
                entries: ENTRIES.empty
            });

            await service.fetchLatest.perform();

            expect(service.entries.length).to.equal(0);
        });

        it('gracefully handles when response status is not ok', async function () {
            const mockUser = createMockUser(USERS.noWhatsNew);
            const service = this.owner.lookup('service:whats-new');
            const sessionService = this.owner.lookup('service:session');

            sessionService.set('user', mockUser);

            server.respondWith('GET', 'https://ghost.org/changelog.json', [
                404,
                {'Content-Type': 'application/json'},
                JSON.stringify({error: 'Not Found'})
            ]);

            // Doesn't throw an error
            await service.fetchLatest.perform();

            // Entries remains empty
            expect(service.entries.length).to.equal(0);
        });

        it('gracefully handles when JSON parsing fails', async function () {
            const mockUser = createMockUser(USERS.noWhatsNew);
            const service = this.owner.lookup('service:whats-new');
            const sessionService = this.owner.lookup('service:session');

            sessionService.set('user', mockUser);

            server.respondWith('GET', 'https://ghost.org/changelog.json', [
                200,
                {'Content-Type': 'application/json'},
                'not-json{{'
            ]);

            // Doesn't throw an error
            await service.fetchLatest.perform();

            // Entries remains empty
            expect(service.entries.length).to.equal(0);
        });
    });

    describe('hasNew', function () {
        const testCases = [
            {
                description: 'returns true when latest entry is newer than lastSeenDate',
                user: USERS.oldWhatsNew,
                entries: ENTRIES.newEntry,
                expected: true
            },
            {
                description: 'returns false when latest entry is older than lastSeenDate',
                user: USERS.futureWhatsNew,
                entries: ENTRIES.newEntry,
                expected: false
            },
            {
                description: 'returns false when there are no entries',
                user: USERS.oldWhatsNew,
                entries: ENTRIES.empty,
                expected: false
            },
            {
                description: 'returns false for new users (lastSeenDate set to today)',
                user: USERS.noWhatsNew,
                entries: ENTRIES.newEntry,
                expected: false
            },
            {
                description: 'returns false when entry published_at equals lastSeenDate exactly',
                user: USERS.exactMatchWhatsNew,
                entries: ENTRIES.newEntry,
                expected: false
            }
        ];

        testCases.forEach(({description, user, entries, expected}) => {
            it(description, async function () {
                const service = setupService(this, {user, entries});
                await service.fetchLatest.perform();
                expect(service.hasNew).to.equal(expected);
            });
        });
    });

    describe('hasNewFeatured', function () {
        const testCases = [
            {
                description: 'returns true when latest entry is featured and new',
                user: USERS.oldWhatsNew,
                entries: ENTRIES.newFeaturedEntry,
                expected: true
            },
            {
                description: 'returns false when latest entry is not featured',
                user: USERS.oldWhatsNew,
                entries: ENTRIES.newNonFeaturedEntry,
                expected: false
            },
            {
                description: 'returns false when latest entry is featured but not new',
                user: USERS.futureWhatsNew,
                entries: ENTRIES.newFeaturedEntry,
                expected: false
            },
            {
                description: 'returns false when there are no entries',
                user: USERS.oldWhatsNew,
                entries: ENTRIES.empty,
                expected: false
            }
        ];

        testCases.forEach(({description, user, entries, expected}) => {
            it(description, async function () {
                const service = setupService(this, {user, entries});
                await service.fetchLatest.perform();
                expect(service.hasNewFeatured).to.equal(expected);
            });
        });
    });

    describe('updateLastSeen', function () {
        it('updates lastSeenDate to latest entry published_at', async function () {
            const mockUser = createMockUser(USERS.oldWhatsNew);
            const service = setupService(this, {
                user: mockUser,
                entries: ENTRIES.multipleEntries
            });

            await service.fetchLatest.perform();
            await service.updateLastSeen.perform();

            expect(mockUser.set.calledOnce).to.be.true;
            const accessibilityArg = mockUser.set.firstCall.args[1];
            const parsedAccessibility = JSON.parse(accessibilityArg);
            expect(parsedAccessibility.whatsNew.lastSeenDate).to.equal('2024-01-15T12:00:00.000+00:00');
            expect(mockUser.save.calledOnce).to.be.true;
        });

        it('does not update when there are no entries', async function () {
            const mockUser = createMockUser(USERS.oldWhatsNew);
            const service = setupService(this, {
                user: mockUser,
                entries: ENTRIES.empty
            });

            await service.fetchLatest.perform();
            await service.updateLastSeen.perform();

            expect(mockUser.set.called).to.be.false;
            expect(mockUser.save.called).to.be.false;
        });

        it('creates whatsNew object if it does not exist', async function () {
            const mockUser = createMockUser(USERS.noWhatsNew);
            const service = setupService(this, {
                user: mockUser,
                entries: ENTRIES.newEntry
            });

            await service.fetchLatest.perform();
            await service.updateLastSeen.perform();

            // Called twice: once in fetchLatest (to set today), once in updateLastSeen
            expect(mockUser.set.calledTwice).to.be.true;
            expect(mockUser.save.calledTwice).to.be.true;

            // Check the final state has the latest entry's date
            const accessibilityArg = mockUser.set.secondCall.args[1];
            const parsedAccessibility = JSON.parse(accessibilityArg);
            expect(parsedAccessibility.whatsNew).to.exist;
            expect(parsedAccessibility.whatsNew.lastSeenDate).to.equal('2024-01-15T12:00:00.000+00:00');
        });

        it('preserves other accessibility settings', async function () {
            const mockUser = createMockUser(USERS.withOtherSettings);
            const service = setupService(this, {
                user: mockUser,
                entries: ENTRIES.newEntry
            });

            await service.fetchLatest.perform();
            await service.updateLastSeen.perform();

            const accessibilityArg = mockUser.set.firstCall.args[1];
            const parsedAccessibility = JSON.parse(accessibilityArg);
            expect(parsedAccessibility.someOtherSetting).to.equal('value');
            expect(parsedAccessibility.whatsNew.lastSeenDate).to.equal('2024-01-15T12:00:00.000+00:00');
        });
    });

    describe('seen action', function () {
        it('updates lastSeenDate to latest entry', async function () {
            const mockUser = createMockUser(USERS.oldWhatsNew);
            const service = setupService(this, {
                user: mockUser,
                entries: ENTRIES.newEntry
            });

            await service.fetchLatest.perform();

            // Call the action
            service.seen();

            // Wait for the action to complete (it calls updateLastSeen task)
            await service.updateLastSeen.last;

            // Verify the outcome: lastSeenDate was updated
            expect(mockUser.set.calledOnce).to.be.true;
            const accessibilityArg = mockUser.set.firstCall.args[1];
            const parsedAccessibility = JSON.parse(accessibilityArg);
            expect(parsedAccessibility.whatsNew.lastSeenDate).to.equal('2024-01-15T12:00:00.000+00:00');
            expect(mockUser.save.calledOnce).to.be.true;
        });
    });
});
