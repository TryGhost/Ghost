const logging = require('@tryghost/logging');
const { createTransactionalMigration } = require('../../utils');

// Which tiers need a shipping address or a phone number moves out of the Stripe Checkout
// settings, into tier requirements, and the ports their answers come back through are renamed
// under `checkout.`. Collection is behind the private `stripeCheckoutCollection` flag, so its
// settings are discarded rather than moved: shipping and the phone number read as off until a
// publisher turns them on again. The tax ID keeps its settings, as it stays a Stripe Checkout
// setting. Discarded settings can't be put back, so rolling back leaves them off too.

// The ports' names before the rename, pinned as they stood when this was written.
const COLLECTED_PORTS = ['shipping_address', 'shipping_name', 'phone'];

module.exports = createTransactionalMigration(
  async function up(knex) {
    const bindings = await knex('members_metafield_bindings')
      .whereIn('port', COLLECTED_PORTS)
      .del();
    const tiers = await knex('stripe_checkout_config_tiers')
      .whereIn('section', ['shipping', 'phone'])
      .del();
    const shipping = await knex('stripe_checkout_config')
      .whereNotNull('shipping')
      .update({ shipping: null });
    logging.info(
      `Discarded Stripe Checkout collection settings: ${bindings} bindings, ${tiers} tier rows and ${shipping} shipping settings`,
    );
  },
  async function down() {
    logging.info('Not restoring discarded Stripe Checkout collection settings');
  },
);
