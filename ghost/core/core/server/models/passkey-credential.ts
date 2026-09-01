const ghostBookshelf = require('./base');

const PasskeyCredentialModel = ghostBookshelf.Model.extend({
  tableName: 'passkey_credentials',

  user() {
    return this.belongsTo('User', 'user_id', 'id');
  },

  member() {
    return this.belongsTo('Member', 'member_id', 'id');
  },
});

const PasskeyCredentialsCollection = ghostBookshelf.Collection.extend({
  model: PasskeyCredentialModel,
});

export const PasskeyCredential = ghostBookshelf.model('PasskeyCredential', PasskeyCredentialModel);
export const PasskeyCredentials = ghostBookshelf.collection(
  'PasskeyCredentials',
  PasskeyCredentialsCollection,
);
