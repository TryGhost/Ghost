const {addSetting} = require('../../utils');

// Which paid tiers are offered as gifts on the gift page. An empty array means
// "all paid tiers" (the previous behaviour), so this is backward compatible.
module.exports = addSetting({
    key: 'gift_tiers',
    value: JSON.stringify([]),
    type: 'array',
    group: 'gifts'
});
