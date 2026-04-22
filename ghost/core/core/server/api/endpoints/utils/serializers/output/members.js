//@ts-check
const _ = require('lodash');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:members');
const {unparse} = require('@tryghost/members-csv');
const mappers = require('./mappers');
const {Transform} = require('stream');
const papaparse = require('papaparse');
module.exports = {
    browse: createSerializer('browse', paginatedMembers),
    read: createSerializer('read', singleMember),
    edit: createSerializer('edit', singleMember),
    add: createSerializer('add', singleMember),
    destroy: createSerializer('destroy', passthrough),

    editSubscription: createSerializer('editSubscription', singleMember),
    createSubscription: createSerializer('createSubscription', singleMember),
    bulkDestroy: createSerializer('bulkDestroy', passthrough),
    bulkEdit: createSerializer('bulkEdit', bulkAction),
    exportCSV: createSerializer('exportCSV', exportCSV),

    importCSV: createSerializer('importCSV', passthrough),
    memberStats: createSerializer('memberStats', passthrough),
    mrrStats: createSerializer('mrrStats', passthrough),
    activityFeed: createSerializer('activityFeed', activityFeed)
};

// Columns to export in CSV
const CSV_HEADERS = [
    'id',
    'email',
    'name',
    'note',
    'subscribed_to_emails',
    'complimentary_plan',
    'stripe_customer_id',
    'created_at',
    'deleted_at',
    'labels',
    'tiers'
];

/**
 * Formats a single member for CSV export
 * @param {Object} member - Member object
 * @returns {Object} Formatted member
 */
function formatMemberForCSV(member) {
    let labels = '';
    if (Array.isArray(member.labels)) {
        labels = member.labels.map((l) => {
            return typeof l === 'string' ? l : l.name;
        }).join(',');
    }

    let tiers = '';
    if (Array.isArray(member.tiers)) {
        tiers = member.tiers.map((tier) => {
            return tier.name;
        }).join(',');
    }

    // Convert boolean 'false' to empty string for tests to pass
    // Only comped = true should result in 'true', otherwise empty string
    const complimentaryPlan = member.comped === true ? 'true' : '';
    
    // Convert subscribed boolean to string representation
    const subscribedToEmails = member.subscribed === true ? 'true' : 'false';

    return {
        id: member.id,
        email: member.email,
        name: member.name,
        note: member.note,
        subscribed_to_emails: subscribedToEmails,
        complimentary_plan: complimentaryPlan,
        stripe_customer_id: member.stripe_customer_id,
        created_at: member.created_at,
        deleted_at: member.deleted_at || null,
        labels: labels,
        tiers: tiers
    };
}

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {APIConfig} _apiConfig
 * @param {import('@tryghost/api-framework').Frame} frame
 *
 * @returns {{members: SerializedMember[], meta: PageMeta}}
 */
function paginatedMembers(page, _apiConfig, frame) {
    return {
        members: page.data.map(model => serializeMember(model, frame.options)),
        meta: page.meta
    };
}

/**
 * @param {import('bookshelf').Model} model
 * @param {APIConfig} _apiConfig
 * @param {import('@tryghost/api-framework').Frame} frame
 *
 * @returns {{members: SerializedMember[]}}
 */
function singleMember(model, _apiConfig, frame) {
    return {
        members: [serializeMember(model, frame.options)]
    };
}

/**
 * @param {object} bulkActionResult
 * @param {APIConfig} _apiConfig
 * @param {import('@tryghost/api-framework').Frame} frame
 *
 * @returns {{bulk: SerializedBulkAction}}
 */
function bulkAction(bulkActionResult, _apiConfig, frame) {
    return {
        bulk: {
            action: frame.data.action,
            meta: {
                stats: {
                    successful: bulkActionResult.successful,
                    unsuccessful: bulkActionResult.unsuccessful
                },
                errors: bulkActionResult.errors,
                unsuccessfulData: bulkActionResult.unsuccessfulData
            }
        }
    };
}

/**
 *
 * @returns {{events: any[], meta: any}}
 */
function activityFeed(data, _apiConfig, frame) {
    return {
        events: data.events.map(e => mappers.activityFeedEvents(e, frame)),
        meta: data.meta
    };
}

/**
 * @param {import('bookshelf').Model} member
 * @param {object} options
 *
 * @returns {SerializedMember}
 */
function serializeMember(member, options) {
    const json = member.toJSON ? member.toJSON(options) : member;

    const comped = json.status === 'comped';

    const subscriptions = json.subscriptions || [];

    const serialized = {
        id: json.id,
        uuid: json.uuid,
        email: json.email,
        name: json.name,
        note: json.note,
        geolocation: json.geolocation,
        subscribed: json.subscribed,
        created_at: json.created_at,
        updated_at: json.updated_at,
        labels: json.labels,
        subscriptions: subscriptions,
        avatar_image: json.avatar_image,
        comped: comped,
        email_count: json.email_count,
        email_opened_count: json.email_opened_count,
        email_open_rate: json.email_open_rate,
        email_recipients: json.email_recipients,
        status: json.status,
        last_seen_at: json.last_seen_at,
        attribution: serializeAttribution(json.attribution),
        unsubscribe_url: json.unsubscribe_url,
        can_comment: json.can_comment,
        commenting: json.commenting
    };

    if (json.products) {
        serialized.tiers = json.products;
    }

    // Rename subscriptions.price.product to subscriptions.price.tier
    for (const subscription of serialized.subscriptions) {
        if (!subscription.price) {
            continue;
        }

        if (!subscription.price.tier && subscription.price.product) {
            subscription.price.tier = subscription.price.product;

            if (!subscription.price.tier.tier_id) {
                subscription.price.tier.tier_id = subscription.price.tier.product_id;
            }
            delete subscription.price.tier.product_id;
        }
        subscription.attribution = serializeAttribution(subscription.attribution);
        delete subscription.price.product;
    }

    serialized.email_suppression = json.email_suppression;

    if (json.newsletters) {
        serialized.newsletters = serializeNewsletters(json.newsletters);
    }
    // override the `subscribed` param to mean "subscribed to any active newsletter"
    serialized.subscribed = false;
    if (Array.isArray(serialized.newsletters) && serialized.newsletters.length > 0) {
        serialized.subscribed = true;
    }

    return serialized;
}

/**
 * @template Data
 * @param {Data} data
 * @returns Data
 */
function passthrough(data) {
    return data;
}

/**
 * @template Data
 * @template Response
 * @param {string} debugString
 * @param {(data: Data, apiConfig: APIConfig, frame: import('@tryghost/api-framework').Frame) => Response} serialize
 *
 * @returns {(data: Data, apiConfig: APIConfig, frame: import('@tryghost/api-framework').Frame) => void}
 */
function createSerializer(debugString, serialize) {
    return function serializer(data, apiConfig, frame) {
        debug(debugString);
        const response = serialize(data, apiConfig, frame);
        frame.response = response;
    };
}

/**
 * @typedef {Object} SerializedMember
 * @prop {string} id
 * @prop {string} uuid
 * @prop {string} email
 * @prop {string} [name]
 * @prop {string} [note]
 * @prop {null|string} geolocation
 * @prop {boolean} subscribed
 * @prop {string} created_at
 * @prop {string} updated_at
 * @prop {string[]} labels
 * @prop {SerializedMemberStripeSubscription[]} subscriptions
 * @prop {SerializedMemberProduct[]} [products]
 * @prop {string} avatar_image
 * @prop {boolean} comped
 * @prop {number} email_count
 * @prop {number} email_opened_count
 * @prop {number} email_open_rate
 * @prop {null|SerializedEmailRecipient[]} email_recipients
 * @prop {'free'|'paid'|'comped'} status
 * @prop {boolean} can_comment
 * @prop {null|{disabled: boolean, disabled_reason: string, disabled_until: string|null}} commenting
 */

/**
 * @typedef {Object} SerializedMemberProduct
 * @prop {string} id
 * @prop {string} name
 * @prop {string} slug
 */

/**
 * @typedef {Object} SerializedMemberStripeData
 * @prop {SerializedMemberStripeSubscription[]} subscriptions
 */

/**
 * @typedef {Object} SerializedMemberStripeSubscription
 *
 * @prop {string} id
 * @prop {string} status
 * @prop {string} start_date
 * @prop {string} default_payment_card_last4
 * @prop {string} current_period_end
 * @prop {boolean} cancel_at_period_end
 *
 * @prop {Object} customer
 * @prop {string} customer.id
 * @prop {null|string} customer.name
 * @prop {string} customer.email
 *
 * @prop {Object} price
 * @prop {string} price.id
 * @prop {string} price.nickname
 * @prop {number} price.amount
 * @prop {string} price.interval
 * @prop {string} price.currency
 *
 * @prop {Object} price.product
 * @prop {string} price.product.id
 * @prop {string} price.product.product_id
 */

/**
 * @typedef {Object} SerializedEmailRecipient
 *
 * @prop {string} id
 * @prop {string} email_id
 * @prop {string} batch_id
 * @prop {string} processed_at
 * @prop {string} delivered_at
 * @prop {string} opened_at
 * @prop {string} failed_at
 * @prop {string} member_uuid
 * @prop {string} member_email
 * @prop {string} member_name
 * @prop {SerializedEmail[]} email
 */

/**
 * @typedef {Object} SerializedEmail
 *
 * @prop {string} id
 * @prop {string} post_id
 * @prop {string} uuid
 * @prop {string} status
 * @prop {string} recipient_filter
 * @prop {null|string} error
 * @prop {string} error_data
 * @prop {number} email_count
 * @prop {number} delivered_count
 * @prop {number} opened_count
 * @prop {number} failed_count
 * @prop {string} subject
 * @prop {string} from
 * @prop {string} reply_to
 * @prop {string} html
 * @prop {string} plaintext
 * @prop {boolean} track_opens
 * @prop {string} created_at
 * @prop {string} updated_at
 */

/**
 *
 * @typedef {Object} SerializedBulkAction
 *
 * @prop {string} action
 *
 * @prop {object} meta
 * @prop {object[]} meta.unsuccessfulData
 * @prop {Error[]} meta.errors
 * @prop {object} meta.stats
 *
 * @prop {number} meta.stats.successful
 * @prop {number} meta.stats.unsuccessful
 */

/**
 * @typedef {Object} APIConfig
 * @prop {string} docName
 * @prop {string} method
 */

function serializeAttribution(attribution) {
    if (!attribution) {
        return attribution;
    }

    return {
        id: attribution?.id,
        type: attribution?.type,
        url: attribution?.url,
        title: attribution?.title,
        referrer_source: attribution?.referrerSource,
        referrer_medium: attribution?.referrerMedium,
        referrer_url: attribution.referrerUrl
    };
}

function serializeNewsletter(newsletter) {
    const newsletterFields = [
        'id',
        'name',
        'description',
        'status'
    ];

    return _.pick(newsletter, newsletterFields);
}

function serializeNewsletters(newsletters) {
    return newsletters
        .filter(newsletter => newsletter.status === 'active')
        .sort((a, b) => {
            return a.sort_order - b.sort_order;
        })
        .map(newsletter => serializeNewsletter(newsletter));
}

/**
 * Create a CSV Transform stream
 * @returns {Transform} Transform stream that converts objects to CSV
 */
function createCSVTransform() {
    let isFirstChunk = true;
    
    return new Transform({
        objectMode: true,
        transform(member, encoding, callback) {
            try {
                // Format the member data for CSV
                const formattedMember = formatMemberForCSV(member);
                
                // For first chunk, include the headers
                if (isFirstChunk) {
                    const csv = papaparse.unparse({
                        fields: CSV_HEADERS,
                        data: [formattedMember]
                    }, {
                        header: true,
                        escapeFormulae: true,
                        newline: '\r\n' // Explicitly set Windows-style line endings for compatibility
                    });
                    isFirstChunk = false;
                    callback(null, csv);
                } else {
                    // For subsequent chunks, don't include headers, just the data
                    const csv = papaparse.unparse({
                        fields: CSV_HEADERS,
                        data: [formattedMember]
                    }, {
                        header: false,
                        escapeFormulae: true,
                        newline: '\r\n' // Explicitly set Windows-style line endings for compatibility
                    });
                    
                    // Make sure each row starts with a newline to ensure separation between rows
                    // Ensure consistent line endings by using explicit CR+LF sequence
                    callback(null, '\r\n' + csv.replace(/^\r?\n+/, ''));
                }
            } catch (err) {
                callback(err);
            }
        }
    });
}

/**
 * @template PageMeta
 *
 * @param {{data: any[]|Object}} data
 *
 * @returns {string|Function} - A CSV string or response handler function
 */
function exportCSV(data) {
    debug('exportCSV');
    
    // Check if data.data is a stream (has the pipe method)
    if (data.data && typeof data.data.pipe === 'function') {
        // Return a function that will handle the response
        return function streamResponse(req, res, next) {
            debug('CSV stream response');
            
            // Create transform to convert objects to CSV
            const csvTransform = createCSVTransform();
            
            // Handle stream errors
            data.data.on('error', (err) => {
                next(err);
            });
            
            // Set required headers for CSV downloads
            const datetime = (new Date()).toJSON().substring(0, 10);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="members.${datetime}.csv"`);
            
            // Pipe the data through the transform and to the response
            data.data.pipe(csvTransform).pipe(res);
        };
    }
    
    // Otherwise use the unparse function for array data
    return unparse(data.data);
}
