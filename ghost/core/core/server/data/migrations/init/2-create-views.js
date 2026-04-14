const views = require('../../schema').views;
const logging = require('@tryghost/logging');

module.exports.up = async (options) => {
    const connection = options.connection;

    for (const [name, sql] of Object.entries(views)) {
        logging.info('Creating view: ' + name);
        await connection.schema.createViewOrReplace(name, function (view) {
            view.as(connection.raw(sql));
        });
    }
};
