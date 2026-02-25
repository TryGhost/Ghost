import crypto from 'crypto';
import type {StripeEvent} from './builders';

const DEFAULT_WEBHOOK_SECRET = 'DEFAULT_WEBHOOK_SECRET';

export class WebhookClient {
    private readonly ghostUrl: string;

    constructor(ghostUrl: string) {
        this.ghostUrl = ghostUrl;
    }

    async sendWebhook(event: StripeEvent): Promise<Response> {
        const payload = JSON.stringify(event);
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
            .createHmac('sha256', DEFAULT_WEBHOOK_SECRET)
            .update(`${timestamp}.${payload}`)
            .digest('hex');
        const header = `t=${timestamp},v1=${signature}`;

        const url = `${this.ghostUrl}/members/webhooks/stripe/`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Stripe-Signature': header
            },
            body: payload
        });

        return response;
    }
}
