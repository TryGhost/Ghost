// Setup for the BullMQ lanes, after vitest-setup-db.ts. A lane that quietly
// ran on the in-memory backend, or skipped its Redis, would pass while proving
// nothing, so both fail the file here instead.
import { afterAll } from 'vitest';

// require, not import: Ghost's modules must be the instances its boot uses
const { getBullMQPrefix, resetJobsBackend } = require('./jobs-backend-utils');
const configUtils = require('./config-utils');
const adapterManager = require('../../core/server/services/adapter-manager').default;

if (process.env.GHOST_TEST_REDIS_AVAILABLE !== '1') {
  throw new Error('The BullMQ lane needs Redis, and none is reachable');
}

configUtils.set('adapters:jobs:BullMQJobsBackend:prefix', getBullMQPrefix());
const backend = adapterManager.getAdapter('jobs').constructor.name;
if (backend !== 'BullMQJobsBackend') {
  throw new Error(`The BullMQ lane is running on ${backend}`);
}

// Empties this process's queues after its last file as well
afterAll(resetJobsBackend);
