const assert = require('node:assert/strict');
const sinon = require('sinon');

const { Milestone } = require('../../../../../core/server/models/milestone');
const DomainEvents = require('@tryghost/domain-events');
const BookshelfMilestoneRepository = require('../../../../../core/server/services/milestones/bookshelf-milestone-repository');
const MilestoneEntity = require('../../../../../core/server/services/milestones/milestone');

describe('BookshelfMilestoneRepository', function () {
  let repository;

  it('Provides expected public API', async function () {
    repository = new BookshelfMilestoneRepository({
      DomainEvents,
      MilestoneModel: Milestone,
      logging: { error: sinon.spy() },
    });

    assert.ok(repository.transaction);
    assert.ok(repository.lockChecks);
    assert.ok(repository.save);
    assert.ok(repository.getLatestByType);
    assert.ok(repository.getLastEmailSent);
    assert.ok(repository.getByARR);
    assert.ok(repository.getByCount);
  });

  describe('save', function () {
    const MilestoneModel = {
      findOne: async () => null,
      add: async () => {},
    };

    it('Logs an error when dispatching the events fails after the commit', async function () {
      const error = new Error('dispatch failed');
      const logging = { error: sinon.spy() };
      const saveRepository = new BookshelfMilestoneRepository({
        DomainEvents: { dispatch: sinon.stub().throws(error) },
        MilestoneModel,
        logging,
      });
      const milestone = await MilestoneEntity.create({ type: 'members', value: 100 });
      const transacting = { executionPromise: Promise.resolve() };

      await saveRepository.save(milestone, { transacting });
      await transacting.executionPromise;
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      sinon.assert.calledOnceWithExactly(logging.error, error);
    });

    it('Dispatches and logs nothing when the transaction rolls back', async function () {
      const dispatch = sinon.spy();
      const logging = { error: sinon.spy() };
      const saveRepository = new BookshelfMilestoneRepository({
        DomainEvents: { dispatch },
        MilestoneModel,
        logging,
      });
      const milestone = await MilestoneEntity.create({ type: 'members', value: 100 });
      const executionPromise = Promise.reject(new Error('rolled back'));
      executionPromise.catch(() => {});

      await saveRepository.save(milestone, { transacting: { executionPromise } });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      sinon.assert.notCalled(dispatch);
      sinon.assert.notCalled(logging.error);
    });
  });
});
