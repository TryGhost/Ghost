import {test as base} from '@playwright/test';

export {expect} from '@playwright/test';
// export const test = base.extend<{ environmentManager: EnvironmentManager, ghost: StartedTestContainer}>({
//     environmentManager: [async function ({}, use) {
//         const environmentManager = EnvironmentManager.getInstance();
//         await environmentManager.setup();
//         await use(environmentManager);
//     }, {auto: true}],
//     ghost: [async ({environmentManager}, use) => {
//         const ghost = await environmentManager.setupGhostInstance();
//         await use(ghost);
//         await environmentManager.teardownGhostInstance(ghost);
//     }, {auto: true}],
//     baseURL: async ({ghost}, use) => {
//         const ghostPort = ghost.getMappedPort(2368);
//         await use(`http://localhost:${ghostPort}`);
//     }
// });
