const {addSetting} = require('../../utils');

// Which paid tiers are switched OFF for gifting. Stored as a disabled-list so
// that tiers are giftable by default (including tiers created later), all of
// them can be disabled at once, and a tier hidden in Portal keeps its gift
// setting — Portal visibility and this list are intersected at read time,
// never written into each other.
module.exports = addSetting({
    key: 'gift_tiers_disabled',
    value: JSON.stringify([]),
    type: 'array',
    group: 'gifts'
});
