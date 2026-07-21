const models = require('../../../models');
const {knex} = require('../../../data/db');
const moment = require('moment');
const logging = require('@tryghost/logging');
const {Transform} = require('stream');
const labs = require('../../../../shared/labs');
const {csvCellsForFields} = require('@tryghost/custom-field-types/csv');

/**
 * Process a batch of members with all their related data
 * @param {Array} members - Array of member records
 * @param {Object} tiersMap - Map of member_id to tiers
 * @param {Object} labelsMap - Map of member_id to labels
 * @param {Object} stripeCustomerMap - Map of member_id to stripe customer IDs
 * @param {Set} subscribedSet - Set of subscribed member IDs
 * @param {Map} giftIdMap - Map of member_id to gift id (for gift members only)
 * @param {Object} allProducts - Map of product IDs to product names
 * @param {Object} allLabels - Map of label IDs to label names
 * @param {Array} activeCustomFields - Active custom field definitions
 * @param {Map} customFieldValuesMap - Map of member_id to their custom field values
 * @returns {Array} Processed member records
 */
function processMembersData(members, tiersMap, labelsMap, stripeCustomerMap, subscribedSet, giftIdMap, allProducts, allLabels, activeCustomFields, customFieldValuesMap) {
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
        row.complimentary_plan = row.status === 'complimentary';
        row.gift_id = giftIdMap.get(row.id) || null;
        row.stripe_customer_id = stripeCustomerMap.get(row.id) || null;
        row.created_at = moment(row.created_at).toISOString();

        // Flattened here rather than in the serializer because the column set is
        // only knowable from the database. Every member carries a cell for every
        // active field's column, so a member with no values still contributes the
        // full set — the CSV header is taken from whichever row streams first.
        row.custom_field_cells = csvCellsForFields(activeCustomFields, customFieldValuesMap.get(row.id) || {});
    }
    return members;
}

/**
 * Creates a streaming implementation of the members export
 * @param {Object} options - Export options
 * @returns {Promise<Object>} A readable stream of processed members
 */
async function createExportStream(options, {definitions, values}) {
    const hasFilter = options.limit !== 'all' || options.filter || options.search;
    const start = Date.now();
    
    let ids = null;
    if (hasFilter) {
        // do a very minimal query, only to fetch the ids of the filtered values
        const filterOptions = {...options};
        filterOptions.withRelated = [];
        filterOptions.columns = ['id'];
        
        // Important: We need to get ALL ids, not just the first page
        filterOptions.limit = 'all';

        const page = await models.Member.findPage(filterOptions);
        ids = page.data.map(d => d.id);
        logging.info(`[MembersExporter] Found ${ids.length} members matching filter criteria`);
    }

    const startFetchingProducts = Date.now();

    // Get all products and labels upfront as these are small tables
    const allProducts = await knex('products').select('id', 'name').then(rows => rows.reduce((acc, product) => {
        acc[product.id] = product.name;
        return acc; 
    }, {}));

    const allLabels = await knex('labels').select('id', 'name').then(rows => rows.reduce((acc, label) => {
        acc[label.id] = label.name;
        return acc;
    }, {}));

    logging.info('[MembersExporter] Fetched products and labels in ' + (Date.now() - startFetchingProducts) + 'ms');

    // Definitions are a small, stable table, so they're read once rather than per
    // batch. Reading once also fixes the column set for the whole file: archiving a
    // field mid-export can't leave the header ragged. It can still leave that
    // field's cells empty from the batch after the archive onwards, because the
    // per-batch value read applies its own active filter.
    const activeCustomFields = labs.isSet('membersCustomFields')
        ? await definitions.browse()
        : [];

    // Create a transform stream that will process the members as they come in
    const processMembersTransform = new Transform({
        objectMode: true,
        highWaterMark: 1000, // Process 1000 members at a time
        async transform(batch, encoding, callback) {
            try {
                const memberIds = batch.map(member => member.id);
                
                // Fetch related data for this batch
                const [tiers, labels, stripeCustomers, subscriptions, gifts, customFieldValuesMap] = await Promise.all([
                    knex('members_products')
                        .select('member_id', knex.raw('GROUP_CONCAT(product_id) as tiers'))
                        .whereIn('member_id', memberIds)
                        .groupBy('member_id'),
                    
                    knex('members_labels')
                        .select('member_id', knex.raw('GROUP_CONCAT(label_id) as labels'))
                        .whereIn('member_id', memberIds)
                        .groupBy('member_id'),
                    
                    knex('members_stripe_customers')
                        .select('member_id', knex.raw('MIN(customer_id) as stripe_customer_id'))
                        .whereIn('member_id', memberIds)
                        .groupBy('member_id'),
                    
                    knex('members_newsletters')
                        .distinct('member_id')
                        .whereIn('member_id', memberIds),

                    knex('gifts')
                        .select('id', 'redeemer_member_id')
                        .where('status', 'redeemed')
                        .whereIn('redeemer_member_id', memberIds),

                    activeCustomFields.length > 0
                        ? values.getValuesForMembers(memberIds)
                        : new Map()
                ]);

                // Create maps for quick lookups
                const tiersMap = new Map(tiers.map(row => [row.member_id, row.tiers]));
                const labelsMap = new Map(labels.map(row => [row.member_id, row.labels]));
                const stripeCustomerMap = new Map(stripeCustomers.map(row => [row.member_id, row.stripe_customer_id]));
                const subscribedSet = new Set(subscriptions.map(row => row.member_id));
                const giftIdMap = new Map(gifts.map(row => [row.redeemer_member_id, row.id]));

                // Process the batch
                const processedMembers = processMembersData(
                    batch, 
                    tiersMap, 
                    labelsMap, 
                    stripeCustomerMap, 
                    subscribedSet, 
                    giftIdMap,
                    allProducts,
                    allLabels,
                    activeCustomFields,
                    customFieldValuesMap
                );

                // Push each member individually to avoid large arrays in memory
                processedMembers.forEach((member) => {
                    this.push(member);
                });
                
                callback();
            } catch (err) {
                callback(err);
            }
        }
    });

    // Create a batching stream to group members
    const batchSize = 1000; // Process in batches of 1000
    let currentBatch = [];
    
    const batchingTransform = new Transform({
        objectMode: true,
        transform(member, encoding, callback) {
            currentBatch.push(member);
            
            if (currentBatch.length >= batchSize) {
                this.push(currentBatch);
                currentBatch = [];
            }
            
            callback();
        },
        flush(callback) {
            if (currentBatch.length > 0) {
                this.push(currentBatch);
            }
            callback();
        }
    });

    // Create a query stream for members
    const membersQuery = knex('members')
        .select('id', 'email', 'name', 'note', 'status', 'created_at');
    
    if (hasFilter) {
        membersQuery.whereIn('id', ids);
    }

    logging.info('[MembersExporter] Starting streaming export of members');
    
    // Chain the streams together
    const membersStream = membersQuery.stream()
        .pipe(batchingTransform)
        .pipe(processMembersTransform);

    // Log when export is complete
    membersStream.on('end', () => {
        logging.info('[MembersExporter] Total time taken for member export: ' + (Date.now() - start) / 1000 + 's');
    });

    return membersStream;
}

/**
 * Export members data
 * @param {Object} options - Export options
 * @returns {Promise<Array|Object>} Array of members or stream of members
 */
module.exports = function createExporter({definitions, values}) {
    return async function (options = {}) {
        return createExportStream(options, {definitions, values});
    };
};
