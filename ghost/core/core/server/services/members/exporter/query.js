const models = require('../../../models');
const {knex} = require('../../../data/db');
const moment = require('moment');
const {unparse} = require('@tryghost/members-csv');
const urlUtils = require('../../../../shared/url-utils');
const storage = require('../../../adapters/storage');
const crypto = require('crypto');
const glob = require('glob');

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

    /*

    explain analyze SELECT 
    id,
    email,
    name,
    note,
    status,
    created_at,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM members_newsletters n 
            WHERE n.member_id = members.id
        ) THEN TRUE 
        ELSE FALSE 
    END AS subscribed,
    (SELECT GROUP_CONCAT(product_id) 
    FROM members_products f 
    WHERE f.member_id = members.id) AS tiers,
    (SELECT GROUP_CONCAT(label_id) 
    FROM members_labels f 
    WHERE f.member_id = members.id) AS labels,
    (SELECT customer_id 
    FROM members_stripe_customers f 
    WHERE f.member_id = members.id LIMIT 1) AS stripe_customer_id
    FROM members

    */

    /*
    explain analyze SELECT id, email, name, note, status, created_at
    FROM members;

    explain analyze SELECT member_id, GROUP_CONCAT(product_id) AS tiers
    FROM members_products
    GROUP BY member_id;

    explain analyze SELECT member_id, GROUP_CONCAT(label_id) AS labels
    FROM members_labels
    GROUP BY member_id;

    explain analyze SELECT member_id, MIN(customer_id) AS stripe_customer_id
    FROM members_stripe_customers
    GROUP BY member_id;

    explain analyze SELECT DISTINCT member_id
    FROM members_newsletters;
    */
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

    return await saveCsv(csv);
};

async function saveCsv(csv) {
    const store = storage.getStorage('files');
    const files = glob.sync('content/files/members/members*');
    files.forEach((file) => {
        store.delete(file, ''); // delete all previously generated member csv files to free up storage space
    });
    const csvStoredUrl = await store.saveRaw(csv, `/members/${generateUniqueFileName()}`);
    return `${urlUtils.urlFor('files', true)}${csvStoredUrl.replace(/^\/+/, '')}`;
}

function generateUniqueFileName() {
    const timestamp = new Date().toISOString();
    const randomHash = crypto.randomBytes(16).toString('hex');
    return `members-${timestamp}-${randomHash}.csv`;
}
