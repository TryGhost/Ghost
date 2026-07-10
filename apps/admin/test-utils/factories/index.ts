/**
 * Factory functions for creating test data — jsdom unit-tier ONLY, not for
 * acceptance specs. Acceptance tests declare their world with
 * `@tryghost/test-data` builders + the fake Admin API (see
 * test-utils/acceptance/README.md).
 *
 * Import from here:
 *   import { mockUser, createRawChangelogEntry, changelogFixtures } from "@test-utils/factories";
 */

export { mockUser } from "./user";

export {
    createRawChangelogEntry,
    createChangelogResponse,
    changelogFixtures,
} from "./changelog";
