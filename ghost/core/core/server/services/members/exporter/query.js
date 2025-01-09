const models = require('../../../models');
const {knex} = require('../../../data/db');
const moment = require('moment');
const urlUtils = require('../../../../shared/url-utils');
const storage = require('../../../adapters/storage');
const csvWriter = require('csv-writer').createObjectCsvStringifier;

module.exports = async function (options) {
    //console.time('total_export_time');

    // Check if filtering is required
    const hasFilter = options.limit !== 'all' || options.filter || options.search;
    let ids = null;

    if (hasFilter) {
        //console.time('filtering_members');
        options.withRelated = [];
        options.columns = ['id'];
        const page = await models.Member.findPage(options);
        ids = page.data.map(d => d.id);
        //console.timeEnd('filtering_members');
    }

    //console.time('fetching_members');
    const membersQuery = knex('members').select('id', 'email', 'name', 'note', 'status', 'created_at');
    if (hasFilter) {
        membersQuery.whereIn('id', ids);
    }
    const members = await membersQuery;
    //console.timeEnd('fetching_members');

    //console.time('fetching_tiers');
    const tiers = await knex('members_products')
        .select('member_id', knex.raw('GROUP_CONCAT(DISTINCT product_id) as tiers'))
        .groupBy('member_id');
    const tiersMap = new Map(tiers.map(row => [row.member_id, row.tiers]));
    //console.timeEnd('fetching_tiers');

    //console.time('fetching_labels');
    const labels = await knex('members_labels')
        .select('member_id', knex.raw('GROUP_CONCAT(DISTINCT label_id) as labels'))
        .groupBy('member_id');
    const labelsMap = new Map(labels.map(row => [row.member_id, row.labels]));
    //console.timeEnd('fetching_labels');

    //console.time('fetching_stripe_customers');
    const stripeCustomers = await knex('members_stripe_customers')
        .select('member_id', knex.raw('MIN(customer_id) as stripe_customer_id'))
        .groupBy('member_id');
    const stripeCustomerMap = new Map(stripeCustomers.map(row => [row.member_id, row.stripe_customer_id]));
    //console.timeEnd('fetching_stripe_customers');

    //console.time('fetching_newsletter_subscriptions');
    const newsletterSubscriptions = await knex('members_newsletters').distinct('member_id');
    const subscribedSet = new Set(newsletterSubscriptions.map(row => row.member_id));
    //console.timeEnd('fetching_newsletter_subscriptions');

    //console.time('processing_rows');
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

    let csvContent = csvWriterInstance.getHeaderString();

    for (const member of members) {
        const tierIds = tiersMap.get(member.id) ? tiersMap.get(member.id).split(',') : [];
        const labelIds = labelsMap.get(member.id) ? labelsMap.get(member.id).split(',') : [];
        const subscribed = subscribedSet.has(member.id);
        const stripeCustomerId = stripeCustomerMap.get(member.id);

        const processedRow = {
            ...member,
            tiers: tierIds.join(', '),
            labels: labelIds.join(', '),
            subscribed,
            comped: member.status === 'comped',
            created_at: moment(member.created_at).toISOString(),
            stripe_customer_id: stripeCustomerId || null
        };

        csvContent += csvWriterInstance.stringifyRecords([processedRow]);
    }
    //console.timeEnd('processing_rows');

    //console.time('storing_csv');
    const store = storage.getStorage('files');
    const imageStoredUrl = await store.saveRaw(csvContent, 'members10h.csv');
    const fileUrl = urlUtils.urlFor('files', {file: imageStoredUrl}, true) + '/content/files/members10h.csv';
    //console.timeEnd('storing_csv');

    //console.timeEnd('total_export_time');
    return fileUrl;
};
