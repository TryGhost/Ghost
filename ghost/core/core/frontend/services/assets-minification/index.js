const AdminAuthAssets = require('./AdminAuthAssets');
const CardAssets = require('./CardAssets');

const adminAuthAssets = new AdminAuthAssets();
const cardAssets = new CardAssets();

module.exports = {
    adminAuthAssets,
    cardAssets
};
