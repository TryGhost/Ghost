import baseDebug from '@tryghost/debug';
import express from 'express';
import http from 'http';
import type {StripeCustomer, StripePaymentMethod, StripeSubscription} from './builders';

const debug = baseDebug('e2e:fake-stripe');

export class FakeStripeServer {
    private server: http.Server | null = null;
    private readonly app = express();
    private readonly _port: number;
    private readonly customers: Map<string, StripeCustomer> = new Map();
    private readonly subscriptions: Map<string, StripeSubscription> = new Map();
    private readonly paymentMethods: Map<string, StripePaymentMethod> = new Map();

    constructor(port: number) {
        this._port = port;
        this.setupRoutes();
    }

    get port(): number {
        return this._port;
    }

    upsertCustomer(customer: StripeCustomer): void {
        this.customers.set(customer.id, customer);
    }

    upsertSubscription(subscription: StripeSubscription): void {
        this.subscriptions.set(subscription.id, subscription);
    }

    upsertPaymentMethod(paymentMethod: StripePaymentMethod): void {
        this.paymentMethods.set(paymentMethod.id, paymentMethod);
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this._port, () => {
                resolve();
            });
            this.server.on('error', reject);
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) {
                resolve();
                return;
            }
            this.server.close(() => {
                this.server = null;
                resolve();
            });
        });
    }

    private setupRoutes(): void {
        this.app.use((req, _res, next) => {
            debug(`${req.method} ${req.originalUrl}`);
            next();
        });

        // GET /v1/customers/:id — returns customer with embedded subscriptions
        this.app.get('/v1/customers/:id', (req, res) => {
            const customerId = req.params.id;
            const customer = this.customers.get(customerId);

            if (!customer) {
                debug(`Customer not found: ${customerId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such customer'}});
                return;
            }

            // Build response with embedded subscriptions (handles expand[]=subscriptions)
            // Expand default_payment_method from ID to full object (handles expand[]=subscriptions.data.default_payment_method)
            const customerSubscriptions = Array.from(this.subscriptions.values())
                .filter(s => s.customer === customerId)
                .map(s => ({
                    ...s,
                    default_payment_method: s.default_payment_method
                        ? (this.paymentMethods.get(s.default_payment_method) ?? s.default_payment_method)
                        : null
                }));

            const response = {
                ...customer,
                subscriptions: {
                    type: 'list' as const,
                    data: customerSubscriptions
                }
            };

            debug(`Returning customer: ${customerId} with ${customerSubscriptions.length} subscription(s)`);
            res.status(200).json(response);
        });

        // GET /v1/subscriptions/:id — returns subscription
        this.app.get('/v1/subscriptions/:id', (req, res) => {
            const subscriptionId = req.params.id;
            const subscription = this.subscriptions.get(subscriptionId);

            if (!subscription) {
                debug(`Subscription not found: ${subscriptionId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such subscription'}});
                return;
            }

            debug(`Returning subscription: ${subscriptionId}`);
            res.status(200).json(subscription);
        });

        // GET /v1/payment_methods/:id — returns payment method
        this.app.get('/v1/payment_methods/:id', (req, res) => {
            const paymentMethodId = req.params.id;
            const paymentMethod = this.paymentMethods.get(paymentMethodId);

            if (!paymentMethod) {
                debug(`Payment method not found: ${paymentMethodId}`);
                res.status(404).json({error: {type: 'invalid_request_error', message: 'No such payment method'}});
                return;
            }

            debug(`Returning payment method: ${paymentMethodId}`);
            res.status(200).json(paymentMethod);
        });

        // POST /v1/billing_portal/configurations(/:id) — returns a portal config
        this.app.post('/v1/billing_portal/configurations/:id?', (req, res) => {
            const id = req.params.id || 'bpc_fake';
            debug(`Returning billing portal configuration: ${id}`);
            res.status(200).json({id, object: 'billing_portal.configuration'});
        });

        // Fallback: return 200 with empty object for unhandled routes
        this.app.use((req, res) => {
            debug(`Unhandled route: ${req.method} ${req.originalUrl} — returning fallback`);
            res.status(200).json({id: 'fake', object: 'unknown'});
        });
    }
}
