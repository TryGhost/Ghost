const CardAssets = require('./CardAssets');
const AdminAuthAssets = require('./AdminAuthAssets');
const cardAssets = new CardAssets();
const adminAuthAssets = new AdminAuthAssets();

module.exports = {
    cardAssets,
    adminAuthAssets
};