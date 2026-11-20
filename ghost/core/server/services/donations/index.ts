import { defineService } from '@tryghost/kernel/define-service';
import { alias } from '../../../shared/service-alias';
import { DonationBookshelfRepository } from './donation-bookshelf-repository';

// Nothing to start. Built when Stripe first reads it for a donation checkout.
export default alias(
  defineService({
    name: 'Donations',
    create: () => {
      // The model registry is not something a definition can be handed yet.
      const { DonationPaymentEvent: DonationPaymentEventModel } = require('../../models');

      return new DonationBookshelfRepository({ DonationPaymentEventModel });
    },
  }),
);
