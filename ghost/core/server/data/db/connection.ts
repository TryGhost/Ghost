import type { Knex } from 'knex';
import application from '../../../../bootstrap/app';

// The database handle is built once, by the application, from Ghost's
// `database` config, and held there. This path is kept for the code that
// imports the connection instead of being handed it.
const knexInstance: Knex | undefined = application.foundation.database?.knex;

// NOTE: this file must contain no export other than the `export =` below - see
// the same note in shared/config/index.ts.

// @ts-expect-error ignore erasableSyntaxOnly here: js files require() this
// module and read the knex instance straight off module.exports.
export = knexInstance;
