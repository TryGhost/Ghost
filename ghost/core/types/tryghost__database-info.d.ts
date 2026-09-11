declare module '@tryghost/database-info' {
  import type { Knex } from 'knex';

  type KnexLike = Pick<Knex, 'client'> | Knex.Transaction;

  export default class DatabaseInfo {
    constructor(knex: Knex);
    init(): Promise<{ driver: string; database: string; engine: string; version: string }>;
    getDriver(): string;
    getDatabase(): string;
    getEngine(): string;
    getVersion(): string;
    static isSQLite(knex: KnexLike): boolean;
    static isSQLiteConfig(config: unknown): boolean;
    static isMySQL(knex: KnexLike): boolean;
    static isMySQLConfig(config: unknown): boolean;
  }
}
