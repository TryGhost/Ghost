const AdminAuthAssets = require('./AdminAuthAssets');
const CardAssets = require('./CardAssets');
const MemberAttributionAssets = require('./MemberAttributionAssets');

const adminAuthAssets = new AdminAuthAssets();
const cardAssets = new CardAssets();
const memberAttributionAssets = new MemberAttributionAssets();

module.exports = {
    adminAuthAssets,
    cardAssets,
    memberAttributionAssets
};
