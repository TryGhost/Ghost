const CardAssets = require('./card-assets');
const AdminAuthAssets = require('./admin-auth-assets');
const cardAssets = new CardAssets();
const adminAuthAssets = new AdminAuthAssets();

module.exports = {
    cardAssets,
    adminAuthAssets
};
