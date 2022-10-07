const should = require('should');
const _ = require('lodash');

const schema = require('../../../../../core/server/data/schema/schema');

describe('schema validations', function () {
    it('has correct isIn validation structure', async function () {
        const tablesOnlyValidation = _.cloneDeep(schema);

        _.each(tablesOnlyValidation, function (table) {
            _.each(table, function (column) {
                const columnIsInValidation = _.get(column, 'validations.isIn');
                // Check column's isIn validation is in correct format
                if (columnIsInValidation) {
                    should(columnIsInValidation).be.Array().with.length(1);
                    should(columnIsInValidation[0]).be.Array();
                }
            });
        });
    });
});
