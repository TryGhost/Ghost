/**
 * Server-side event firing on page views (page, post, tags...)
 */
module.exports = class OfferRedemptionEvent {
  declare data: {
    memberId: string;
    offerId: string;
    subscriptionId: string;
  };
  declare timestamp: Date;

  constructor(data: OfferRedemptionEvent['data'], timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: OfferRedemptionEvent['data'], timestamp?: Date) {
    return new OfferRedemptionEvent(data, timestamp || new Date());
  }
};
