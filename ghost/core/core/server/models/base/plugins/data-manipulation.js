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
        fixDatesWhenSave: function fixDatesWhenSave(attrs) {
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
        fixDatesWhenFetch: function fixDatesWhenFetch(attrs) {
            const tableDef = schema.tables[this.tableName];

            Object.keys(attrs).forEach((key) => {
                if (attrs[key] && tableDef?.[key]?.type === 'dateTime') {
                    const dateMoment = moment(attrs[key]);

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
            const tableDef = schema.tables[this.tableName];

            Object.keys(attrs).forEach((key) => {
                if (tableDef?.[key]?.type === 'boolean') {
                    attrs[key] = !!attrs[key];
                }
            });

            return attrs;
        }
    });
};
