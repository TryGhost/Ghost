const _ = require('lodash');
const debug = require('ghost-ignition').debug('users');

module.exports = function ({
    stripe,
    Member
}) {
    async function get(data, options) {
        debug(`get id:${data.id} email:${data.email}`);
        return Member.findOne(data, options);
    }

    async function destroy(data, options) {
        debug(`destroy id:${data.id} email:${data.email}`);
        const member = await Member.findOne(data, options);
        if (!member) {
            return;
        }

        if (stripe && options.cancelStripeSubscriptions) {
            await stripe.cancelStripeSubscriptions(member);
        }

        return Member.destroy({
            id: data.id
        }, options);
    }

    async function update(data, options) {
        debug(`update id:${options.id}`);
        return Member.edit(_.pick(data, [
            'email',
            'name',
            'note',
            'labels',
            'geolocation'
        ]), options);
    }

    async function list(options = {}) {
        return Member.findPage(options);
    }

    async function create({email, name, note, labels, geolocation}, options) {
        debug(`create email:${email}`);

        /** Member.add model method expects label object array*/
        if (labels) {
            labels.forEach((label, index) => {
                if (_.isString(label)) {
                    labels[index] = {name: label};
                }
            });
        }

        return Member.add({
            email,
            name,
            note,
            labels,
            geolocation
        }, options);
    }

    function safeStripe(methodName) {
        return async function (...args) {
            if (stripe) {
                return await stripe[methodName](...args);
            }
        };
    }

    async function linkStripeCustomerById(customerId, memberId) {
        if (!stripe) {
            return;
        }
        const member = await get({id: memberId});
        return stripe.linkStripeCustomer(customerId, member);
    }

    async function setComplimentarySubscriptionById(memberId) {
        if (!stripe) {
            return;
        }
        const member = await get({id: memberId});
        return stripe.setComplimentarySubscription(member);
    }

    return {
        create,
        update,
        list,
        get,
        destroy,
        setComplimentarySubscription: safeStripe('setComplimentarySubscription'),
        setComplimentarySubscriptionById,
        cancelComplimentarySubscription: safeStripe('cancelComplimentarySubscription'),
        cancelStripeSubscriptions: safeStripe('cancelComplimentarySubscription'),
        getStripeCustomer: safeStripe('getCustomer'),
        createStripeCustomer: safeStripe('createCustomer'),
        createComplimentarySubscription: safeStripe('createComplimentarySubscription'),
        linkStripeCustomer: safeStripe('linkStripeCustomer'),
        linkStripeCustomerById
    };
};
