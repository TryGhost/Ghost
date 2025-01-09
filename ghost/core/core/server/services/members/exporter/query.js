const models = require('../../../models');
const {knex} = require('../../../data/db');
const moment = require('moment');
const urlUtils = require('../../../../shared/url-utils');
const storage = require('../../../adapters/storage');
const csvWriter = require('csv-writer').createObjectCsvStringifier;

module.exports = async function (options) {
    const hasFilter = options.limit !== 'all' || options.filter || options.search;
    let ids = null;

    if (hasFilter) {
        options.withRelated = [];
        options.columns = ['id'];
        const page = await models.Member.findPage(options);
        ids = page.data.map(d => d.id);
    }

    const [
        members,
        tiers,
        labels,
        stripeCustomers,
        newsletterSubscriptions
    ] = await Promise.all([
        knex('members')
            .select('id', 'email', 'name', 'note', 'status', 'created_at')
            .modify((query) => {
                if (hasFilter) {
                    query.whereIn('id', ids);
                }
            }),
        knex('members_products')
            .select('member_id', knex.raw('GROUP_CONCAT(DISTINCT product_id) as tiers'))
            .groupBy('member_id'),
        knex('members_labels')
            .select('member_id', knex.raw('GROUP_CONCAT(DISTINCT label_id) as labels'))
            .groupBy('member_id'),
        knex('members_stripe_customers')
            .select('member_id', knex.raw('MIN(customer_id) as stripe_customer_id'))
            .groupBy('member_id'),
        knex('members_newsletters')
            .distinct('member_id')
    ]);

    const tiersMap = new Map(tiers.map(row => [row.member_id, row.tiers]));
    const labelsMap = new Map(labels.map(row => [row.member_id, row.labels]));
    const stripeCustomerMap = new Map(stripeCustomers.map(row => [row.member_id, row.stripe_customer_id]));
    const subscribedSet = new Set(newsletterSubscriptions.map(row => row.member_id));

    const csvWriterInstance = csvWriter({
        header: [
            {id: 'id', title: 'ID'},
            {id: 'email', title: 'Email'},
            {id: 'name', title: 'Name'},
            {id: 'note', title: 'Note'},
            {id: 'status', title: 'Status'},
            {id: 'created_at', title: 'Created At'},
            {id: 'subscribed', title: 'Subscribed'},
            {id: 'comped', title: 'Comped'},
            {id: 'tiers', title: 'Tiers'},
            {id: 'labels', title: 'Labels'},
            {id: 'stripe_customer_id', title: 'Stripe Customer ID'}
        ]
    });

    const batchSize = 10000;
    const batches = [];
    for (let i = 0; i < members.length; i += batchSize) {
        batches.push(members.slice(i, i + batchSize));
    }

    const processBatch = (batch) => {
        return batch.map((member) => {
            const tierIds = tiersMap.get(member.id)?.split(',') || [];
            const labelIds = labelsMap.get(member.id)?.split(',') || [];
            const subscribed = subscribedSet.has(member.id);
            const stripeCustomerId = stripeCustomerMap.get(member.id);

            return csvWriterInstance.stringifyRecords([{
                ...member,
                tiers: tierIds.join(', '),
                labels: labelIds.join(', '),
                subscribed,
                comped: member.status === 'comped',
                created_at: moment(member.created_at).toISOString(),
                stripe_customer_id: stripeCustomerId || null
            }]);
        }).join('');
    };

    const csvContent = [
        csvWriterInstance.getHeaderString(),
        ...(await Promise.all(batches.map(processBatch)))
    ].join('');

    const store = storage.getStorage('files');
    const imageStoredUrl = await store.saveRaw(csvContent, 'members10h.csv');
    return urlUtils.urlFor('files', {file: imageStoredUrl}, true) + 'content/files/members10h.csv';
};
