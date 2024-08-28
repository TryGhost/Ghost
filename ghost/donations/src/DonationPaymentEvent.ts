export class DonationPaymentEvent {
    timestamp: Date;
    name: string | null;
    email: string;
    memberId: string | null;
    amount: number;
    currency: string;
    donationMessage: string | null;

    attributionId: string | null;
    attributionUrl: string | null;
    attributionType: string | null;
    referrerSource: string | null;
    referrerMedium: string | null;
    referrerUrl: string | null;

    constructor(data: Omit<DonationPaymentEvent, 'timestamp'>, timestamp: Date) {
        this.timestamp = timestamp;

        this.name = data.name;
        this.email = data.email;
        this.memberId = data.memberId;
        this.amount = data.amount;
        this.currency = data.currency;
        this.donationMessage = data.donationMessage;

        this.attributionId = data.attributionId;
        this.attributionUrl = data.attributionUrl;
        this.attributionType = data.attributionType;
        this.referrerSource = data.referrerSource;
        this.referrerMedium = data.referrerMedium;
        this.referrerUrl = data.referrerUrl;
    }

    static create(data: Omit<DonationPaymentEvent, 'timestamp'>, timestamp?: Date) {
        return new DonationPaymentEvent(
            data,
            timestamp ?? new Date()
        );
    }
}
