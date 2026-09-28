const models = require('../../models');
const { getProvider } = require('../email-provider');
const MailgunEmailSuppressionList = require('./mailgun-email-suppression-list');

const remove = (email, reason) => getProvider().removeSuppression(email, reason);
const apiClient = {
  removeBounce: (email) => remove(email, 'bounce'),
  removeComplaint: (email) => remove(email, 'complaint'),
  removeUnsubscribe: (email) => remove(email, 'unsubscribe'),
};

module.exports = new MailgunEmailSuppressionList({
  Suppression: models.Suppression,
  apiClient,
});
