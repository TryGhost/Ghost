const {converter} = require('./lib');

const convertCSV = async (originFilePath, destinationFilePath) => {
    await converter.normalizeMembersCSV({
        path: originFilePath,
        destination: destinationFilePath,
        columnsToMap: [{
            from: 'email_disabled',
            to: 'subscribed_to_emails',
            negate: true
        }, {
            from: 'stripe_connected_customer_id',
            to: 'stripe_customer_id'
        }],
        columnsToExtract: [{
            name: 'email',
            lookup: /^email/i
        }, {
            name: 'name',
            lookup: /name/i
        }, {
            name: 'note',
            lookup: /note/i
        }, {
            name: 'subscribed_to_emails',
            lookup: /subscribed_to_emails/i
        }, {
            name: 'stripe_customer_id',
            lookup: /stripe_customer_id/i
        }, {
            name: 'complimentary_plan',
            lookup: /complimentary_plan/i
        }]
    });
};

module.exports = convertCSV;
