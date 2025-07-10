const BaseBuilder = require('./base-builder');
const crypto = require('crypto');
const {faker} = require('@faker-js/faker');

/**
 * MemberBuilder provides a fluent interface for creating members with precise control
 */
class MemberBuilder extends BaseBuilder {
    constructor(factory) {
        super(factory, 'members');
    }

    /**
     * Set member email
     */
    withEmail(email) {
        return this.set('email', email.toLowerCase());
    }

    /**
     * Set member name
     */
    withName(name) {
        return this.set('name', name);
    }

    /**
     * Set member status (free, paid, comped)
     */
    withStatus(status) {
        if (!['free', 'paid', 'comped'].includes(status)) {
            throw new Error(`Invalid member status: ${status}. Must be 'free', 'paid', or 'comped'`);
        }
        return this.set('status', status);
    }

    /**
     * Set when the member was created
     */
    withCreatedAt(date) {
        return this.set('created_at', this.factory.dateToDatabase(date));
    }

    /**
     * Set member newsletter subscription
     */
    withNewsletters() {
        // Newsletter subscriptions are handled via members_newsletters table
        return this;
    }

    /**
     * Set geolocation
     */
    withGeolocation(geolocation) {
        return this.set('geolocation', geolocation);
    }

    /**
     * Set email count
     */
    withEmailCount(count) {
        return this.set('email_count', count);
    }

    /**
     * Set email opened count
     */
    withEmailOpenedCount(count) {
        return this.set('email_opened_count', count);
    }

    /**
     * Set last seen at
     */
    withLastSeenAt(date) {
        return this.set('last_seen_at', this.factory.dateToDatabase(date));
    }

    /**
     * Create a member with Stripe customer
     */
    withStripeCustomer(customerId = null) {
        const stripeCustomerId = customerId || `cus_${crypto.randomBytes(14).toString('hex')}`;
        
        return this.afterCreate(async (member) => {
            await this.factory.insert('members_stripe_customers', {
                member_id: member.id,
                customer_id: stripeCustomerId,
                email: member.email,
                name: member.name,
                created_by: '1'
            });
        });
    }

    /**
     * Create a paid member with subscription
     */
    asPaidMember({
        tier = null,
        cadence = 'month',
        startDate = new Date(),
        price = null,
        stripeStatus = 'active'
    } = {}) {
        // Set status to paid
        this.withStatus('paid');
        
        return this.afterCreate(async (member) => {
            // Find or create a product/tier
            let product = tier;
            if (!product) {
                product = await this.factory.getRandomRecord('products', {type: 'paid'});
                if (!product) {
                    // Create a default paid product
                    product = await this.factory.insert('products', {
                        name: 'Default Tier',
                        slug: 'default-tier',
                        type: 'paid',
                        active: true,
                        visibility: 'public'
                    });
                }
            }

            // Find or create stripe product
            let stripeProduct = await this.factory.getRandomRecord('stripe_products', {
                product_id: product.id
            });
            
            if (!stripeProduct) {
                // Create stripe product
                stripeProduct = await this.factory.insert('stripe_products', {
                    product_id: product.id,
                    stripe_product_id: `prod_${crypto.randomBytes(14).toString('hex')}`
                });
            }

            // Find or create stripe price
            let stripePrice = price;
            if (!stripePrice) {
                stripePrice = await this.factory.getRandomRecord('stripe_prices', {
                    stripe_product_id: stripeProduct.stripe_product_id,
                    interval: cadence
                });
                
                if (!stripePrice) {
                    // Create stripe price
                    stripePrice = await this.factory.insert('stripe_prices', {
                        stripe_price_id: `price_${crypto.randomBytes(14).toString('hex')}`,
                        stripe_product_id: stripeProduct.stripe_product_id,
                        active: true,
                        currency: 'usd',
                        type: 'recurring',
                        interval: cadence,
                        amount: cadence === 'month' ? 500 : 5000
                    });
                }
            }

            // Create stripe customer
            const stripeCustomer = await this.factory.insert('members_stripe_customers', {
                member_id: member.id,
                customer_id: `cus_${crypto.randomBytes(14).toString('hex')}`,
                email: member.email,
                name: member.name,
                created_by: '1'
            });

            // Create subscription
            const subscriptionId = `sub_${crypto.randomBytes(14).toString('hex')}`;
            const subscription = await this.factory.insert('members_stripe_customers_subscriptions', {
                customer_id: stripeCustomer.customer_id,
                subscription_id: subscriptionId,
                stripe_price_id: stripePrice.stripe_price_id,
                status: stripeStatus,
                cancel_at_period_end: false,
                current_period_end: this.factory.dateToDatabase(
                    new Date(startDate.getTime() + (cadence === 'month' ? 30 : 365) * 24 * 60 * 60 * 1000)
                ),
                start_date: this.factory.dateToDatabase(startDate),
                created_by: '1',
                // Legacy fields still required
                plan_id: stripePrice.stripe_price_id,
                plan_nickname: `${cadence}ly`,
                plan_interval: cadence,
                plan_amount: stripePrice.amount,
                plan_currency: stripePrice.currency,
                mrr: cadence === 'month' ? stripePrice.amount : Math.floor(stripePrice.amount / 12)
            });

            // Create member product relationship
            await this.factory.insert('members_products', {
                member_id: member.id,
                product_id: product.id
            });

            // Create member paid subscription event
            await this.factory.insert('members_paid_subscription_events', {
                member_id: member.id,
                subscription_id: subscription.id,
                from_plan: null,
                to_plan: stripePrice.stripe_price_id,
                currency: stripePrice.currency,
                source: 'stripe',
                mrr_delta: stripePrice.amount
            });
        });
    }

    /**
     * Create a comped member
     */
    asCompedMember(tier = null) {
        this.withStatus('comped');
        
        return this.afterCreate(async (member) => {
            // Find or create a product/tier
            let product = tier;
            if (!product) {
                product = await this.factory.getRandomRecord('products', {type: 'paid'});
                if (!product) {
                    // Create a default paid product
                    product = await this.factory.insert('products', {
                        name: 'Default Tier',
                        slug: 'default-tier',
                        type: 'paid',
                        active: true,
                        visibility: 'public'
                    });
                }
            }

            // Create member product relationship
            await this.factory.insert('members_products', {
                member_id: member.id,
                product_id: product.id
            });
        });
    }

    /**
     * Create a free member
     */
    asFreeMember() {
        return this.withStatus('free');
    }

    /**
     * Add labels to the member
     */
    withLabels(labels) {
        return this.afterCreate(async (member) => {
            for (const labelName of labels) {
                // Find or create label
                let label = await this.factory.knex('labels')
                    .where('name', labelName)
                    .first();
                    
                if (!label) {
                    label = await this.factory.insert('labels', {
                        name: labelName,
                        slug: this.factory.generateSlug(labelName),
                        created_by: '1'
                    });
                }
                
                // Create member label relationship
                await this.factory.insert('members_labels', {
                    member_id: member.id,
                    label_id: label.id
                });
            }
        });
    }

    /**
     * Subscribe member to newsletters
     */
    withNewsletterSubscriptions(newsletterIds) {
        return this.afterCreate(async (member) => {
            for (const newsletterId of newsletterIds) {
                await this.factory.insert('members_newsletters', {
                    member_id: member.id,
                    newsletter_id: newsletterId
                });
            }
        });
    }

    /**
     * Generate default values specific to members
     */
    generateDefaults() {
        const defaults = super.generateDefaults();
        
        // Member-specific defaults
        if (!this.data.uuid) {
            defaults.uuid = crypto.randomUUID();
        }
        
        if (!this.data.email) {
            defaults.email = faker.internet.email().toLowerCase();
        }
        
        if (!this.data.status) {
            defaults.status = 'free';
        }
        
        if (!this.data.email_count) {
            defaults.email_count = 0;
        }
        
        if (!this.data.email_opened_count) {
            defaults.email_opened_count = 0;
        }
        
        // Generate transient_id if not provided
        if (!this.data.transient_id) {
            defaults.transient_id = crypto.randomBytes(16).toString('hex');
        }
        
        // Set created_by to a system user ID
        if (!this.data.created_by) {
            defaults.created_by = '1'; // Default to system user
        }
        
        return defaults;
    }
}

module.exports = MemberBuilder;