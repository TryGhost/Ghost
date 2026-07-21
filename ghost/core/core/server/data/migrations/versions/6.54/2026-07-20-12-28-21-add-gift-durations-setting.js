const {addSetting} = require('../../utils');

module.exports = addSetting({
    key: 'gift_durations',
    value: JSON.stringify([1, 12]),
    type: 'array',
    group: 'gifts'
});
