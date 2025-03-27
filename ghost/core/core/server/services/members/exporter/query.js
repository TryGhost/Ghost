const models = require('../../../models');
const {knex} = require('../../../data/db');
const moment = require('moment');
const logging = require('@tryghost/logging');

module.exports = async function (options) {
    const hasFilter = options.limit !== 'all' || options.filter || options.search;
    const start = Date.now();

    let ids = null;
    if (hasFilter) {
        // do a very minimal query, only to fetch the ids of the filtered values
        // should be quite fast
        options.withRelated = [];
        options.columns = ['id'];

        const page = await models.Member.findPage(options);
        ids = page.data.map(d => d.id);

        /*
        const filterOptions = _.pick(options, ['transacting', 'context']);

        if (all !== true) {
            // Include mongoTransformer to apply subscribed:{true|false} => newsletter relation mapping
            Object.assign(filterOptions, _.pick(options, ['filter', 'search', 'mongoTransformer']));
        }

        const memberRows = await models.Member.getFilteredCollectionQuery(filterOptions)
            .select('members.id')
            .distinct();

        ids = memberRows.map(row => row.id);
        */
    }

    const startFetchingProducts = Date.now();

    const allProducts = await knex('products').select('id', 'name').then(rows => rows.reduce((acc, product) => {
        acc[product.id] = product.name;
        return acc; 
    }, {})
    );

    const allLabels = await knex('labels').select('id', 'name').then(rows => rows.reduce((acc, label) => {
        acc[label.id] = label.name;
        return acc;
    }, {})
    );

    logging.info('[MembersExporter] Fetched products and labels in ' + (Date.now() - startFetchingProducts) + 'ms');

    const startFetchingMembers = Date.now();

    const members = await knex('members')
        .select('id', 'email', 'name', 'note', 'status', 'created_at')
        .modify((query) => {
            if (hasFilter) {
                query.whereIn('id', ids);
            }
        });

    logging.info('[MembersExporter] Fetched members in ' + (Date.now() - startFetchingMembers) + 'ms');

    const startFetchingTiers = Date.now();

    const tiers = await knex('members_products')
        .select('member_id', knex.raw('GROUP_CONCAT(product_id) as tiers'))
        .groupBy('member_id')
        .modify((query) => {
            if (hasFilter) {
                query.whereIn('member_id', ids);
            }
        });

    logging.info('[MembersExporter] Fetched tiers in ' + (Date.now() - startFetchingTiers) + 'ms');

    const startFetchingLabels = Date.now();

    const labels = await knex('members_labels')
        .select('member_id', knex.raw('GROUP_CONCAT(label_id) as labels'))
        .groupBy('member_id')
        .modify((query) => {
            if (hasFilter) {
                query.whereIn('member_id', ids);
            }
        });

    logging.info('[MembersExporter] Fetched labels in ' + (Date.now() - startFetchingLabels) + 'ms');

    const startFetchingStripeCustomers = Date.now();

    const stripeCustomers = await knex('members_stripe_customers')
        .select('member_id', knex.raw('MIN(customer_id) as stripe_customer_id'))
        .groupBy('member_id')
        .modify((query) => {
            if (hasFilter) {
                query.whereIn('member_id', ids);
            }
        });

    logging.info('[MembersExporter] Fetched stripe customers in ' + (Date.now() - startFetchingStripeCustomers) + 'ms');

    const startFetchingSubscriptions = Date.now();

    const subscriptions = await knex('members_newsletters')
        .distinct('member_id')
        .modify((query) => {
            if (hasFilter) {
                query.whereIn('member_id', ids);
            }
        });

    logging.info('[MembersExporter] Fetched subscriptions in ' + (Date.now() - startFetchingSubscriptions) + 'ms');

    const startInMemoryProcessing = Date.now();

    const tiersMap = new Map(tiers.map(row => [row.member_id, row.tiers]));
    const labelsMap = new Map(labels.map(row => [row.member_id, row.labels]));
    const stripeCustomerMap = new Map(stripeCustomers.map(row => [row.member_id, row.stripe_customer_id]));
    const subscribedSet = new Set(subscriptions.map(row => row.member_id));

    for (const row of members) {
        const tierIds = tiersMap.get(row.id) ? tiersMap.get(row.id).split(',') : [];
        const tierDetails = tierIds.map((id) => {
            return {
                name: allProducts[id]
            };
        });
        row.tiers = tierDetails;

        const labelIds = labelsMap.get(row.id) ? labelsMap.get(row.id).split(',') : [];
        const labelDetails = labelIds.map((id) => {
            return {
                name: allLabels[id]
            };
        });
        row.labels = labelDetails;

        row.subscribed = subscribedSet.has(row.id);
        row.comped = row.status === 'comped';
        row.stripe_customer_id = stripeCustomerMap.get(row.id) || null;
        row.created_at = moment(row.created_at).toISOString();
    }

    logging.info('[MembersExporter] In memory processing finished in ' + (Date.now() - startInMemoryProcessing) + 'ms');

    logging.info('[MembersExporter] Total time taken for member export: ' + (Date.now() - start) / 1000 + 's');

    return members;
};
