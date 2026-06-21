const {assertExists} = require('../utils/assertions');
const testUtils = require('../utils');
const {getMemberStats} = require('../../core/frontend/utils/member-count.js');

describe('Front-end member stats ', function () {
    // getMemberStats reads statsService.api, which only exists once Ghost has
    // booted. Boot a backend here rather than depending on whichever file ran
    // before in the shared fork having left the service initialised.
    beforeAll(async function () {
        await testUtils.startGhost({
            backend: true,
            frontend: false
        });
    });

    afterAll(async function () {
        await testUtils.stopGhost();
    });

    it('should return free', async function () {
        const members = await getMemberStats();
        const {free} = members;
        assertExists(free);
    });

    it('should return paid', async function () {
        const members = await getMemberStats();
        const {paid} = members;
        assertExists(paid);
    });

    it('should return comped', async function () {
        const members = await getMemberStats();
        const {comped} = members;
        assertExists(comped);
    });

    it('should return total', async function () {
        const members = await getMemberStats();
        const {total} = members;
        assertExists(total);
    });
});
