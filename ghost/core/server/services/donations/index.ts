import { defineService } from '../../../../bootstrap/transition/define-service';
import { DonationBookshelfRepository } from './donation-bookshelf-repository';

export default defineService('Donations', () => {
  const { DonationPaymentEvent: DonationPaymentEventModel } = require('../../models');

  return new DonationBookshelfRepository({ DonationPaymentEventModel });
});
