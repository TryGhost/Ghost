const assert = require('node:assert/strict');

const {Milestone} = require('../../../../../core/server/models/milestone');
const DomainEvents = require('@tryghost/domain-events');

describe('BookshelfMilestoneRepository', function () {
    let repository;

    it('Provides expected public API', async function () {
        const BookshelfMilestoneRepository = require('../../../../../core/server/services/milestones/bookshelf-milestone-repository');
        repository = new BookshelfMilestoneRepository({
            DomainEvents,
            MilestoneModel: Milestone
        });

        assert.ok(repository.save);
        assert.ok(repository.getLatestByType);
        assert.ok(repository.getLastEmailSent);
        assert.ok(repository.getByARR);
        assert.ok(repository.getByCount);
    });
});
