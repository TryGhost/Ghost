import assert from 'node:assert/strict';

const { agentProvider, configUtils } = require('../utils/e2e-framework');

// Node records bullmq, and the ioredis it loads, here on either import or require
function loadedModules(name: string) {
  return Object.keys(require.cache).filter((path) => path.includes(`/node_modules/${name}/`));
}

// Isolated: another file in the same process could have loaded bullmq
describe('In-memory jobs backend', function () {
  it('never loads bullmq, or ioredis through it, on a booted Ghost', async function () {
    await agentProvider.getAdminAPIAgent();

    assert.equal(configUtils.config.get('adapters:jobs:active'), 'InMemoryJobsBackend');
    assert.deepEqual(loadedModules('bullmq'), []);
    assert.deepEqual(loadedModules('ioredis'), []);

    // The control: the checks above would see them if they were loaded
    await import('../../core/server/adapters/jobs/BullMQJobsBackend');
    assert.notDeepEqual(loadedModules('bullmq'), []);
    assert.notDeepEqual(loadedModules('ioredis'), []);
  });
});
