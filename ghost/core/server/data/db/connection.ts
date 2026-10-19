import knex, { type Knex } from 'knex';
import config from '../../../shared/config';
import { configure, type DatabaseConfig } from './configure-knex';

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())

const dbConfig = config.get('database') as DatabaseConfig | undefined;
const knexInstance: Knex | undefined = dbConfig?.client ? knex(configure(dbConfig)) : undefined;

// NOTE: this file must contain no export other than the `export =` below - see
// the same note in shared/config/index.ts.

// @ts-expect-error ignore erasableSyntaxOnly here: js files require() this
// module and read the knex instance straight off module.exports.
export = knexInstance;
