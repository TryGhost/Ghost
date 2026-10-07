export interface SendGiftDeliveryEventData {
  deliveryId: string;
}

export class SendGiftDeliveryEvent {
  readonly data: SendGiftDeliveryEventData;
  readonly timestamp: Date;

  constructor(data: SendGiftDeliveryEventData, timestamp: Date) {
    this.data = data;
    this.timestamp = timestamp;
  }

  static create(data: SendGiftDeliveryEventData, timestamp = new Date()) {
    return new SendGiftDeliveryEvent(data, timestamp);
  }
}
