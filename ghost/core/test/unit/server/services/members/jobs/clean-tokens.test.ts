import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, afterEach } from 'vitest';
import cleanTokens from '../../../../../../core/server/services/members/jobs/clean-tokens-task';
import CleanTokensJob from '../../../../../../core/server/services/members/jobs/clean-tokens-job';

describe('clean-tokens job', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('cleanTokens task', function () {
    it('deletes tokens created more than 24 hours ago', async function () {
      let capturedWhere: string[] = [];
      const deleteStub = sinon.stub().resolves(3);
      const knex = sinon.stub().callsFake((table: string) => {
        assert.equal(table, 'tokens');
        return {
          where: (...args: string[]) => {
            capturedWhere = args;
            return { delete: deleteStub };
          },
        };
      });

      const deleted = await cleanTokens({
        db: { knex: knex as never },
        logging: { info: sinon.stub() },
      });

      assert.equal(capturedWhere[0], 'created_at');
      assert.equal(capturedWhere[1], '<');
      assert.match(capturedWhere[2]!, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      assert.equal(deleted, 3);
    });

    it('logs a structured clean_tokens.completed event with the deleted count', async function () {
      const knex = sinon.stub().returns({
        where: () => ({ delete: sinon.stub().resolves(3) }),
      });
      const infoStub = sinon.stub();

      await cleanTokens({ db: { knex: knex as never }, logging: { info: infoStub } });

      const completionLog = infoStub
        .getCalls()
        .find((call) => call.args[0]?.system?.event === 'clean_tokens.completed');
      assert.ok(completionLog, 'the task logs a structured clean_tokens.completed event');
      assert.equal(completionLog!.args[0].system.deleted_count, 3);
    });
  });

  describe('CleanTokensJob', function () {
    it('has a stable type and an empty, serialisable payload', function () {
      assert.equal(CleanTokensJob.type, 'clean-tokens');

      const job = new CleanTokensJob();
      assert.equal(JSON.stringify(job), '{}');
    });
  });
});
