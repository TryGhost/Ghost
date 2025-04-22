const AdminAuthAssets = require('./AdminAuthAssets');
const CardAssets = require('./CardAssets');
const CommentCountsAssets = require('./CommentCountsAssets');
const MemberAttributionAssets = require('./MemberAttributionAssets');
const GhostStatsAssets = require('./GhostStatsAssets');

const adminAuthAssets = new AdminAuthAssets();
const cardAssets = new CardAssets();
const commentCountsAssets = new CommentCountsAssets();
const memberAttributionAssets = new MemberAttributionAssets();
const ghostStatsAssets = new GhostStatsAssets();

module.exports = {
    adminAuthAssets,
    cardAssets,
    commentCountsAssets,
    memberAttributionAssets,
    ghostStatsAssets
};