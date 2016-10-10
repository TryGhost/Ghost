var program = require('commander'),
    Sephiroth = require('../'),
    config = require('../../../config'),
    logging = require('../../../logging'),
    sephiroth = new Sephiroth({database: config.get('database')});

/**
 * @TODO:
 * - make migration folder configurable
 * - dirty requires
 */

program
    .command('init')
    .description('populate tables')
    .option('--init', 'populate tables')
    .action(function () {
        return sephiroth.commands.init()
            .then(function () {
                logging.info('Finished database init!');
            }).catch(function (err) {
                logging.error(err);
            }).finally(process.exit);
    });

program.parse(process.argv);
