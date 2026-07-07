import {Knex} from 'knex';

declare function createConnection(dbConfig: Knex.Config): Knex;

export = createConnection;
