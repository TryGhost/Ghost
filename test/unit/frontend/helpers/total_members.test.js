const should = require('should');

const total_members = require('../../../../core/frontend/helpers/total_members');

describe('{{total_members}} helper', function () {
    it('can render total members', async function () {
        const rendered = await total_members.call({});
        should.exist(rendered.string);
    });
});
