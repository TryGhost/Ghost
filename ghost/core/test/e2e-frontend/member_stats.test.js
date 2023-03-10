const should = require('should');
const {getMemberStats} = require('../../core/frontend/utils/member-count.js');

describe('Front-end member stats ', function () {
    it('should return free', async function () {
        const members = await getMemberStats();
        const {free} = members;
        should.exist(free);
    });

    it('should return paid', async function () {
        const members = await getMemberStats();
        const {paid} = members;
        should.exist(paid);
    });

    it('should return comped', async function () {
        const members = await getMemberStats();
        const {comped} = members;
        should.exist(comped);
    });

    it('should return total', async function () {
        const members = await getMemberStats();
        const {total} = members;
        should.exist(total);
    });
});
