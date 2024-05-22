const assert = require('assert/strict');

const models = require('../../../../../core/server/models');
const DomainEvents = require('@tryghost/domain-events');

describe('BookshelfMilestoneRepository', function () {
    let repository;

    it('Provides expected public API', async function () {
        const BookshelfMilestoneRepository = require('../../../../../core/server/services/milestones/BookshelfMilestoneRepository');
        repository = new BookshelfMilestoneRepository({
            DomainEvents,
            MilestoneModel: models.Milestone
        });

        assert.ok(repository.save);
        assert.ok(repository.getLatestByType);
        assert.ok(repository.getLastEmailSent);
        assert.ok(repository.getByARR);
        assert.ok(repository.getByCount);
    });
});
