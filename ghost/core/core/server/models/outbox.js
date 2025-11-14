const ghostBookshelf = require('./base');

const OUTBOX_STATUSES = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    FAILED: 'failed',
    COMPLETED: 'completed'
};

const Outbox = ghostBookshelf.Model.extend({
    tableName: 'outbox',

    defaults() {
        return {
            status: OUTBOX_STATUSES.PENDING,
            retry_count: 0
        };
    }
});

module.exports = {
    Outbox: ghostBookshelf.model('Outbox', Outbox),
    OUTBOX_STATUSES
};