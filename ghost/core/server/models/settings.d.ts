import type { Knex } from 'knex';

interface SettingModel {
  get(key: 'value'): unknown;
  toJSON(): unknown;
}

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
