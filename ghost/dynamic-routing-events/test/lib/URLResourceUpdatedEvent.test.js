const assert = require('assert');
const {URLResourceUpdatedEvent} = require('../../index');

describe('URLResourceUpdatedEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = URLResourceUpdatedEvent.create({
            id: 'resource-id'
        });

        assert(event instanceof URLResourceUpdatedEvent);
    });
});
