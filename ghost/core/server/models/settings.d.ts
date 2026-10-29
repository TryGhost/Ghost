import type { Knex } from 'knex';

interface SettingModel {
  get(key: 'value'): unknown;
  toJSON(): unknown;
}

// The Settings model methods used by typed services.
export const Settings: {
  findOne(
    data: { key: string },
    options: { transacting: Knex.Transaction; forUpdate: true },
  ): Promise<SettingModel | null>;
  edit(
    data: { key: string; value: string | null }[],
    options: { transacting: Knex.Transaction; context: { internal: true } },
  ): Promise<unknown>;
};
