const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MachinePaymentEvent = ghostBookshelf.Model.extend(
  {
    tableName: 'machine_payment_events',
  },
  {
    async edit() {
      throw new errors.IncorrectUsageError({ message: 'Cannot edit MachinePaymentEvent' });
    },

    async destroy() {
      throw new errors.IncorrectUsageError({ message: 'Cannot destroy MachinePaymentEvent' });
    },
  },
);

module.exports = {
  MachinePaymentEvent: ghostBookshelf.model('MachinePaymentEvent', MachinePaymentEvent),
};
