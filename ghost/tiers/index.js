const TierActivatedEvent = require('./lib/TierActivatedEvent');
const TierArchivedEvent = require('./lib/TierArchivedEvent');
const TierCreatedEvent = require('./lib/TierCreatedEvent');
const TierNameChangeEvent = require('./lib/TierNameChangeEvent');
const TierPriceChangeEvent = require('./lib/TierPriceChangeEvent');

module.exports = {
    Tier: require('./lib/Tier'),
    TiersAPI: require('./lib/TiersAPI'),
    InMemoryTierRepository: require('./lib/InMemoryTierRepository'),
    TierActivatedEvent,
    TierArchivedEvent,
    TierCreatedEvent,
    TierNameChangeEvent,
    TierPriceChangeEvent
};
