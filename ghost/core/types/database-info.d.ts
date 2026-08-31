declare module '@tryghost/database-info' {
  import type { Knex } from 'knex';

  interface DatabaseInfo {
    isSQLite(knex: Knex): boolean;
  }

  const databaseInfo: DatabaseInfo;
  export default databaseInfo;
}
