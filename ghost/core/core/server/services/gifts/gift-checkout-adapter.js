const logging = require('@tryghost/logging');

/**
 * Stripe and Bookshelf adapter used only by the gifts module.
 *
 * The module interface deals in stable member/customer IDs. Stripe customer
 * objects and Bookshelf models stay on this side of the seam.
 */
module.exports = class GiftCheckoutAdapter {
    constructor({StripeCustomerModel, getStripeApi}) {
        this.StripeCustomerModel = StripeCustomerModel;
        this.getStripeApi = getStripeApi;
    }

    async getCustomerId({memberId, email, name}) {
        if (!memberId) {
            return null;
        }

        const rows = await this.StripeCustomerModel.where({
            member_id: memberId
        }).query().select('customer_id');

        for (const row of rows) {
            try {
                const customer = await this.getStripeApi().getCustomer(row.customer_id);
                if (!customer.deleted) {
                    return customer.id;
                }
            } catch (err) {
                logging.warn(err);
            }
        }

        const customer = await this.getStripeApi().createCustomer({
            email,
            name
        });

        await this.StripeCustomerModel.add({
            member_id: memberId,
            customer_id: customer.id,
            email: customer.email,
            name: customer.name
        });

        return customer.id;
    }

    async createSession(data) {
        const {customerId, ...sessionData} = data;
        const session = await this.getStripeApi().createGiftCheckoutSession({
            ...sessionData,
            customer: customerId ? {id: customerId} : null
        });

        return session.url;
    }
};
