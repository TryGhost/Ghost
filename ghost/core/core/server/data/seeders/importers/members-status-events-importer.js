const { TableImporter } = require('./table-importer');
const { randomDateBetween } = require('../utils/random');
const { toDatabaseDate } = require('../../../lib/db-date');

class MembersStatusEventsImporter extends TableImporter {
  static table = 'members_status_events';
  static dependencies = ['members'];

  constructor(knex, transaction) {
    super(MembersStatusEventsImporter.table, knex, transaction);
  }

  async import(quantity) {
    let offset = 0;
    let limit = 100000;

    while (true) {
      const members = await this.transaction
        .select('id', 'created_at', 'status')
        .from('members')
        .limit(limit)
        .offset(offset);

      if (members.length === 0) {
        break;
      }

      await this.importForEach(members, quantity ? quantity / members.length : 2);
      offset += limit;
    }
  }

  setReferencedModel(model) {
    this.events = [
      {
        id: this.fastFakeObjectId(),
        member_id: model.id,
        from_status: null,
        to_status: 'free',
        created_at: toDatabaseDate(model.created_at),
      },
    ];
    if (model.status !== 'free') {
      this.events.push({
        id: this.fastFakeObjectId(),
        member_id: model.id,
        from_status: 'free',
        to_status: model.status,
        created_at: toDatabaseDate(randomDateBetween(model.created_at, new Date())),
      });
    }
  }

  generate() {
    const event = this.events.pop();
    if (!event) {
      return null;
    }
    return event;
  }
}

module.exports = MembersStatusEventsImporter;
