const db = require('../../data/db');
const MemberStatsService = require('./lib/members-stats-service');

module.exports = {
    members: new MemberStatsService({db})
};
