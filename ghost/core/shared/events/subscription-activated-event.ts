/**
 * Fired when a subscription becomes active.
 */
module.exports = class SubscriptionActivatedEvent {
  declare data: {
    source: string;
    memberId: string;
    batchId: string;
    tierId: string;
    subscriptionId: string;
    attribution: string;
    offerId: string;
  };
  declare timestamp: Date;

  constructor(data: SubscriptionActivatedEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: SubscriptionActivatedEvent['data'], timestamp?: Date) {
    return new SubscriptionActivatedEvent(data, timestamp ?? new Date());
  }
};
