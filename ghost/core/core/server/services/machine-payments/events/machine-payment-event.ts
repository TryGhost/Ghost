import errors from '@tryghost/errors';

export type MachinePaymentEventData = {
  postId: string;
  amount: number;
  currency: string;
  protocol: string;
  method: string;
  stripePaymentIntentId?: string | null;
  reference: string;
};

export class MachinePaymentEvent {
  timestamp: Date;
  postId: string;
  amount: number;
  currency: string;
  protocol: string;
  method: string;
  stripePaymentIntentId: string | null;
  reference: string;

  constructor(data: MachinePaymentEventData, timestamp: Date) {
    this.timestamp = timestamp;
    this.postId = data.postId;
    this.amount = data.amount;
    this.currency = data.currency;
    this.protocol = data.protocol;
    this.method = data.method;
    this.stripePaymentIntentId = data.stripePaymentIntentId ?? null;
    this.reference = data.reference;
  }

  static create(data: MachinePaymentEventData, timestamp?: Date) {
    const required: Array<keyof MachinePaymentEventData> = [
      'postId',
      'amount',
      'currency',
      'protocol',
      'method',
      'reference',
    ];
    for (const key of required) {
      if (data?.[key] === undefined || data?.[key] === null || data?.[key] === '') {
        throw new errors.ValidationError({
          message: `MachinePaymentEvent.${key} is required`,
        });
      }
    }

    return new MachinePaymentEvent(data, timestamp ?? new Date());
  }
}
