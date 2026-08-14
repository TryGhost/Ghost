const {assertExists} = require('../utils/assertions');
const testUtils = require('../utils');
const {getMemberStats} = require('../../core/frontend/utils/member-count.js');

describe('Front-end member stats ', function () {
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
