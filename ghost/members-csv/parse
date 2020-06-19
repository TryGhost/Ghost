const fsLib = require('../../../../../../lib/fs');

const parse = async (filePath) => {
    const columnsToExtract = [{
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
    }, {
        name: 'labels',
        lookup: /labels/i
    }, {
        name: 'created_at',
        lookup: /created_at/i
    }];

    return await fsLib.readCSV({
        path: filePath,
        columnsToExtract: columnsToExtract
    });
};

module.exports.parse = parse;
