/**
 * Mirage JS setup for Ghost Portal
 *
 * This module exports everything needed to use Mirage in tests and development.
 */

export { makeServer } from './server';
export { scenarios, setupServerState, createSingleTierSite, createMultiTierSite } from './test-helpers';
export * as factories from './factories';