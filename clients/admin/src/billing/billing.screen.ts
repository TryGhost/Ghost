import { page } from 'vitest/browser';
import { billingFrame, billingLoadErrorText } from '@tryghost/test-data/selectors/billing';

export const billingScreen = {
  frame: () => page.getByTitle(billingFrame, { exact: true }),
  loadError: () => page.getByRole('alert').filter({ hasText: billingLoadErrorText }),
};
