const models = require('../../models');
const { getSources } = require('../email-provider');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

// Unsuppression must clear every retained account that may still hold the address.
const remove = async (email, reason) => {
  for (const provider of getSources()) {
    await provider.removeSuppression(email, reason);
  }
};
const apiClient = {
  removeBounce: (email) => remove(email, 'bounce'),
  removeComplaint: (email) => remove(email, 'complaint'),
  removeUnsubscribe: (email) => remove(email, 'unsubscribe'),
};

module.exports = new MailgunEmailSuppressionList({
  Suppression: models.Suppression,
  apiClient,
});
