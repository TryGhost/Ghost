const CardAssets = require('./card-assets');
const AdminAuthAssets = require('./admin-auth-assets');

let cardAssets;
let adminAuthAssets;

// Instantiated lazily: the AdminAuthAssets constructor touches the filesystem,
// and consumers that only want cardAssets shouldn't trigger that
module.exports = {
  get cardAssets() {
    cardAssets = cardAssets || new CardAssets();
    return cardAssets;
  },
  get adminAuthAssets() {
    adminAuthAssets = adminAuthAssets || new AdminAuthAssets();
    return adminAuthAssets;
  },
};
