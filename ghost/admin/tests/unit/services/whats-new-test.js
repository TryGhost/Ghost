import Service from '@ember/service';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: whats-new', function () {
    setupTest();

    // Composable fixture fragments
    const seenRecently = {
        lastSeenDate: '2024-12-01T00:00:00.000Z'
    };

    const seenLongAgo = {
        lastSeenDate: '2024-01-01T00:00:00.000Z'
    };

    const neverSeen = {
        lastSeenDate: null
    };

    const newEntry = {
        entries: [{
            title: 'New Feature',
            published_at: '2024-12-01T00:00:00.000Z',
            featured: false
        }]
    };

    const oldEntry = {
        entries: [{
            title: 'Old Feature',
            published_at: '2024-01-01T00:00:00.000Z',
            featured: false
        }]
    };

    const newFeaturedEntry = {
        entries: [{
            title: 'Featured Update',
            published_at: '2024-12-01T00:00:00.000Z',
            featured: true
        }]
    };

    const oldFeaturedEntry = {
        entries: [{
            title: 'Old Featured Update',
            published_at: '2024-01-01T00:00:00.000Z',
            featured: true
        }]
    };

    const noEntries = {
        entries: []
    };

    const onboardingInactive = {
        isChecklistShown: null,
        checklistState: null
    };

    const onboardingActive = {
        isChecklistShown: true,
        checklistState: 'started'
    };

    const onboardingComplete = {
        isChecklistShown: false,
        checklistState: 'completed'
    };

    const defaultFixture = {
        ...neverSeen,
        ...noEntries,
        ...onboardingInactive
    };

    const setup = function (fixtures = {}) {
        const config = {
            ...defaultFixture,
            ...fixtures
        };

        // Build accessibility JSON
        const accessibility = {};
        if (config.lastSeenDate !== null) {
            accessibility.whatsNew = {
                lastSeenDate: config.lastSeenDate
            };
        }
        if (config.checklistState !== null) {
            accessibility.onboarding = {
                checklistState: config.checklistState
            };
        }

        const mockUser = {
            accessibility: JSON.stringify(accessibility)
        };

        this.owner.register('service:session', Service.extend({
            user: mockUser
        }));

        this.owner.register('service:store', Service.extend({}));

        if (config.isChecklistShown !== null) {
            this.owner.register('service:onboarding', Service.extend({
                isChecklistShown: config.isChecklistShown
            }));
        }

        const service = this.owner.lookup('service:whats-new');
        service.set('_user', mockUser);
        service.set('entries', config.entries);

        return service;
    };

    describe('hasNew', function () {
        it('returns false when no entries exist', function () {
            const service = setup.call(this, {...seenLongAgo, ...noEntries});

            expect(service.hasNew).to.be.false;
        });

        it('returns true when latest entry is newer than lastSeenDate', function () {
            const service = setup.call(this, {...seenLongAgo, ...newEntry});

            expect(service.hasNew).to.be.true;
        });

        it('returns false when latest entry is older than lastSeenDate', function () {
            const service = setup.call(this, {...seenRecently, ...oldEntry});

            expect(service.hasNew).to.be.false;
        });

        it('defaults to 2019-01-01 when no lastSeenDate exists', function () {
            const service = setup.call(this, {...neverSeen, ...newEntry});

            expect(service.hasNew).to.be.true;
        });
    });

    describe('hasNewFeatured', function () {
        it('returns true when hasNew is true and latest entry is featured', function () {
            const service = setup.call(this, {...seenLongAgo, ...newFeaturedEntry});

            expect(service.hasNewFeatured).to.be.true;
        });

        it('returns false when hasNew is false', function () {
            const service = setup.call(this, {...seenRecently, ...oldFeaturedEntry});

            expect(service.hasNewFeatured).to.be.false;
        });

        it('returns false when hasNew is true but entry is not featured', function () {
            const service = setup.call(this, {...seenLongAgo, ...newEntry});

            expect(service.hasNewFeatured).to.be.false;
        });

        it('returns false when entries array is empty', function () {
            const service = setup.call(this, {...neverSeen, ...noEntries});

            expect(service.hasNewFeatured).to.be.false;
        });
    });

    describe('shouldShowFeaturedBanner', function () {
        it('returns false when onboarding checklist is shown', function () {
            const service = setup.call(this, {...newFeaturedEntry, ...onboardingActive});

            expect(service.hasNewFeatured).to.be.true; // Would normally show
            expect(service.shouldShowFeaturedBanner).to.be.false; // But hidden during onboarding
        });

        it('returns true when onboarding checklist is not shown', function () {
            const service = setup.call(this, {...seenLongAgo, ...newFeaturedEntry, ...onboardingComplete});

            expect(service.hasNewFeatured).to.be.true;
            expect(service.shouldShowFeaturedBanner).to.be.true; // Shows after onboarding
        });
    });
});
