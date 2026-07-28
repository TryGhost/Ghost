import assert from 'node:assert/strict';
import {URLResourceUpdatedEvent} from '../../../../core/shared/events';

describe('URLResourceUpdatedEvent', function () {
    it('exports a static create method to create instances', function () {
        const event = URLResourceUpdatedEvent.create({
            id: 'resource-id'
        });

        assert(event instanceof URLResourceUpdatedEvent);
    });
});
