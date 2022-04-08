const db = require('../../data/db');
const MemberStatsService = require('./lib/members-stats-service');
const MrrStatsService = require('./lib/mrr-stats-service');

module.exports = {
    members: new MemberStatsService({db}),
    mrr: new MrrStatsService({db})
};
