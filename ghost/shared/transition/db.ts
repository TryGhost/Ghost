/** The legacy database connection: one site's database, connected to when it is first asked for. */
import type { Knex } from 'knex';
import { forSite } from './for-site';

const legacy: { readonly knex: Knex } = require('../../core/server/data/db');

export const db = forSite(legacy);
