module.exports = class SubscriptionCancelledEvent {
  declare data: {
    source: string;
    memberId: string;
    tierId: string;
    subscriptionId: string;
    cancelNow: boolean;
    expiryAt: Date;
    canceledAt: Date;
  };
  declare timestamp: Date;

  constructor(data: SubscriptionCancelledEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: SubscriptionCancelledEvent['data'], timestamp?: Date) {
    return new SubscriptionCancelledEvent(data, timestamp || new Date());
  }
};
