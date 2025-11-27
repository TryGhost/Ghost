const luxon = require('luxon');
const moment = require('moment-timezone');

/**
 * force UTC
 *   - old way: you can require moment or moment-timezone
 *   - new way: you should use Luxon - work is in progress to switch from moment.
 *
 *   - you are allowed to use new Date() to instantiate datetime values for models, because they are transformed into UTC in the model layer
 *   - be careful when not working with models, every value from the native JS Date is local TZ
 *   - be careful when you work with date operations, therefore always wrap a date with our timezone library
 */
luxon.Settings.defaultZone = 'UTC';
moment.tz.setDefault('UTC');

/**
 * Monkey-patch better-sqlite3 Knex client to auto-expand array bindings
 * This maintains compatibility with MySQL/sqlite3 where IN (?) with array bindings works automatically
 */
try {
    const BetterSqlite3Client = require('knex/lib/dialects/better-sqlite3/index.js');
    const originalQuery = BetterSqlite3Client.prototype._query;

    BetterSqlite3Client.prototype._query = function (connection, obj) {
        // Expand array bindings before executing query
        if (obj.bindings && obj.bindings.length > 0) {
            let bindingIndex = 0;
            const expandedBindings = [];

            // Replace each ? placeholder, expanding arrays into multiple placeholders
            obj.sql = obj.sql.replace(/\?/g, () => {
                if (bindingIndex >= obj.bindings.length) {
                    return '?';
                }

                const binding = obj.bindings[bindingIndex];
                bindingIndex += 1;

                if (Array.isArray(binding)) {
                    // Expand array into multiple ? placeholders
                    expandedBindings.push(...binding);
                    return binding.map(() => '?').join(', ');
                } else {
                    expandedBindings.push(binding);
                    return '?';
                }
            });

            obj.bindings = expandedBindings;
        }
        return originalQuery.call(this, connection, obj);
    };
} catch (err) {
    // better-sqlite3 dialect may not be available in production, which is fine
}
