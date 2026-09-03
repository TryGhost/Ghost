const BaseDatabaseInfo = require('@tryghost/database-info');

/**
 * Local extension of @tryghost/database-info that understands Postgres.
 * @TODO: upstream to @tryghost/database-info
 */
class DatabaseInfo extends BaseDatabaseInfo {
  /** @param {import('knex').Knex} knex */
  static isPostgres(knex) {
    return knex?.client?.config?.client === 'pg';
  }

  static isPostgresConfig(config) {
    return config.client === 'pg';
  }

  async init() {
    if (this._driver !== 'pg') {
      return super.init();
    }
    this._databaseDetails.database = 'PostgreSQL';
    this._databaseDetails.engine = 'postgres';
    try {
      const result = await this._knex.raw('SHOW server_version');
      this._databaseDetails.version = result.rows[0].server_version;
    } catch {
      // ignore
    }
    return this._databaseDetails;
  }
}

module.exports = DatabaseInfo;
