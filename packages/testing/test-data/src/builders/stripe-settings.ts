/** A connected Stripe account, ready to spread into settingsResponse({settings}). */
export function connectedStripeSettings(
  overrides: Partial<ConnectedStripeSettings> = {},
): ConnectedStripeSettings {
  return {
    stripe_connect_display_name: 'Dummy',
    stripe_connect_livemode: false,
    stripe_connect_account_id: 'acct_123',
    stripe_connect_publishable_key: 'pk_test_123',
    stripe_connect_secret_key: 'sk_test_123',
    ...overrides,
  };
}

export type ConnectedStripeSettings = {
  stripe_connect_display_name: string | null;
  stripe_connect_livemode: boolean;
  stripe_connect_account_id: string | null;
  stripe_connect_publishable_key: string | null;
  stripe_connect_secret_key: string | null;
};
