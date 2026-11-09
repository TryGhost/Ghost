const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const { addUnique, dropUnique } = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    // This index had two different index names. Make sure to cover both.
    await dropUnique('automations', ['name'], knex);
    await dropUnique('automations', ['name'], knex, 'welcome_email_automations_name_unique');
  },

  async function down(knex) {
    // MySQL's unique index ignores case and accents, so === would miss
    // collisions such as 'Welcome' and 'welcome'. This approximates its
    // collation in memory. This is imprecise (e.g., it doesn't match MySQL
    // exactly), but should be good enough--we shouldn't be rolling this back
    // anyway.
    class CollatedSet {
      #collator = new Intl.Collator('en', { sensitivity: 'base' });
      /** @type {string[]} */ #strings = [];

      /** @param {string} string */
      add(string) {
        this.#strings.push(string);
      }

      /** @param {string} string */
      has(string) {
        return this.#strings.some((s) => this.#collator.compare(s, string) === 0);
      }
    }

    await knex.transaction(async (trx) => {
      const automations = await trx('automations').select('id', 'name').orderBy('id').forUpdate();
      const namesSeen = new CollatedSet();
      let renamedCount = 0;

      // It's okay to iterate over all automations. There's a hard cap of 50.
      // eslint-disable-next-line no-restricted-syntax
      for (const { id, name: oldName } of automations) {
        let newName = oldName;

        // Usually, the new name will be the old name. But if there was a
        // collision, we pick "New Automation (N)". This is arguably a bad user
        // experience--user data will be clobbered--but properly handling this
        // is complex, and this is only in an unexpected "down" migration for a
        // beta feature.
        // eslint-disable-next-line no-restricted-syntax
        for (let suffix = 2; namesSeen.has(newName); suffix += 1) {
          newName = `New Automation (${suffix})`;
        }

        if (newName !== oldName) {
          await trx('automations').where('id', id).update({ name: newName });
          renamedCount += 1;
          logging.info(`Renamed automation ${id} to restore name uniqueness`);
        }

        namesSeen.add(newName);
      }

      logging.info(`Renamed ${renamedCount} automation(s) before restoring name uniqueness`);
    });

    await addUnique('automations', ['name'], knex);
  },
);
