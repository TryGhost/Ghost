const _ = require('lodash');
const moment = require('moment');

const schema = require('../../../data/schema');

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({
        getNullableStringProperties() {
            const table = schema.tables[this.tableName];
            return Object.keys(table).filter(column => table[column].nullable);
        },

        setEmptyValuesToNull: function setEmptyValuesToNull() {
            const nullableStringProps = this.getNullableStringProperties();
            return nullableStringProps.forEach((prop) => {
                if (this.get(prop) === '') {
                    this.set(prop, null);
                }
            });
        },

        /**
         * before we insert dates into the database, we have to normalize
         * date format is now in each db the same
         */
        fixDatesWhenSave: function fixDates(attrs) {
            const self = this;

            _.each(attrs, function each(value, key) {
                if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables, self.tableName)
                && Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
                && schema.tables[self.tableName][key].type === 'dateTime') {
                    attrs[key] = moment(value).format('YYYY-MM-DD HH:mm:ss');
                }
            });

            return attrs;
        },

        /**
         * all supported databases (sqlite, mysql) return different values
         *
         * sqlite:
         *   - knex returns a UTC String (2018-04-12 20:50:35)
         * mysql:
         *   - knex wraps the UTC value into a local JS Date
         */
        fixDatesWhenFetch: function fixDates(attrs) {
            const self = this;
            let dateMoment;

            _.each(attrs, function each(value, key) {
                if (value !== null
                && Object.prototype.hasOwnProperty.call(schema.tables[self.tableName], key)
                && schema.tables[self.tableName][key].type === 'dateTime') {
                    dateMoment = moment(value);

                    // CASE: You are somehow able to store e.g. 0000-00-00 00:00:00
                    // Protect the code base and return the current date time.
                    if (dateMoment.isValid()) {
                        attrs[key] = dateMoment.startOf('seconds').toDate();
                    } else {
                        attrs[key] = moment().startOf('seconds').toDate();
                    }
                }
            });

            return attrs;
        },

        // Convert integers to real booleans
        fixBools: function fixBools(attrs) {
            const self = this;
            _.each(attrs, function each(value, key) {
                const tableDef = schema.tables[self.tableName];
                const columnDef = tableDef ? tableDef[key] : null;
                if (columnDef?.type === 'boolean') {
                    attrs[key] = value ? true : false;
                }
            });

            return attrs;
        }
    });
};
