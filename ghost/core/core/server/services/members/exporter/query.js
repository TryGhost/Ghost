const models = require('../../../models');
const {knex} = require('../../../data/db');
const moment = require('moment');
const {unparse} = require('@tryghost/members-csv');
const urlUtils = require('../../../../shared/url-utils');
const storage = require('../../../adapters/storage');

module.exports = async function (options) {
    const hasFilter = options.limit !== 'all' || options.filter || options.search;

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

    const allProducts = await models.Product.fetchAll();
    const allLabels = await models.Label.fetchAll();

    const [members, tiers, labels, stripeCustomers, subscriptions] = await Promise.all([
        knex('members')
            .select('id', 'email', 'name', 'note', 'status', 'created_at')
            .modify((query) => {
                if (hasFilter) {
                    query.whereIn('id', ids);
                }
            }),
        knex('members_products')
            .select('member_id', knex.raw('GROUP_CONCAT(product_id) as tiers'))
            .groupBy('member_id')
            .modify((query) => {
                if (hasFilter) {
                    query.whereIn('member_id', ids);
                }
            }),
        knex('members_labels')
            .select('member_id', knex.raw('GROUP_CONCAT(label_id) as labels'))
            .groupBy('member_id')
            .modify((query) => {
                if (hasFilter) {
                    query.whereIn('member_id', ids);
                }
            }),
        knex('members_stripe_customers')
            .select('member_id', knex.raw('MIN(customer_id) as stripe_customer_id'))
            .groupBy('member_id')
            .modify((query) => {
                if (hasFilter) {
                    query.whereIn('member_id', ids);
                }
            }),
        knex('members_newsletters')
            .distinct('member_id')
            .modify((query) => {
                if (hasFilter) {
                    query.whereIn('member_id', ids);
                }
            })
    ]);

    const tiersMap = new Map(tiers.map(row => [row.member_id, row.tiers]));
    const labelsMap = new Map(labels.map(row => [row.member_id, row.labels]));
    const stripeCustomerMap = new Map(stripeCustomers.map(row => [row.member_id, row.stripe_customer_id]));
    const subscribedSet = new Set(subscriptions.map(row => row.member_id));

    for (const row of members) {
        const tierIds = tiersMap.get(row.id) ? tiersMap.get(row.id).split(',') : [];
        const tierDetails = tierIds.map((id) => {
            const tier = allProducts.find(p => p.id === id);
            return {
                name: tier.get('name')
            };
        });
        row.tiers = tierDetails;
        const labelIds = labelsMap.get(row.id) ? labelsMap.get(row.id).split(',') : [];
        const labelDetails = labelIds.map((id) => {
            const label = allLabels.find(l => l.id === id);
            return {
                name: label.get('name')
            };
        });
        row.labels = labelDetails;

        row.subscribed = subscribedSet.has(row.id);
        row.comped = row.status === 'comped';
        row.stripe_customer_id = stripeCustomerMap.get(row.id) || null;
        row.created_at = moment(row.created_at).toISOString();
    }

    const csv = unparse(members);

    const store = storage.getStorage('files');
    await store.delete('members.csv', 'content/files');
    const csvStoredUrl = await store.saveRaw(csv, 'members.csv');
    const finalUrl = `${urlUtils.urlFor('files', true)}${csvStoredUrl.replace(/^\/+/, '')}`;
    return finalUrl;
};
