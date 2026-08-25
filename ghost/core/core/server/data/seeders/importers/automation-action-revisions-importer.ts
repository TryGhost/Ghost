import { faker } from '@faker-js/faker';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { TableImporter } from './table-importer';
import { fromDatabaseDate, toDatabaseDate } from '../../../lib/db-date';
import { DEFAULT_EMAIL_DESIGN_SETTING_SLUG } from '../../../services/member-welcome-emails/constants';

type AutomationAction = {
  id: string;
  type: 'wait' | 'send_email';
  created_at: string;
};

type AutomationActionRevision = {
  id: string;
  created_at: string;
  action_id: string;
  wait_hours: number | null;
  email_subject: string | null;
  email_lexical: string | null;
  email_design_setting_id: string | null;
  email_sent_count: number | null;
  email_opened_count: number | null;
  email_clicked_count: number | null;
};

export class AutomationActionRevisionsImporter extends TableImporter<
  AutomationActionRevision,
  AutomationAction
> {
  static table = 'automation_action_revisions';
  static dependencies = ['automation_actions'];

  #action?: AutomationAction;
  #emailDesignSettingId?: string;
  #revisionIndex = 0;

  defaultQuantity = 16;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(AutomationActionRevisionsImporter.table, knex, transaction);
  }

  async import(quantity = this.defaultQuantity): Promise<void> {
    const actions = await this.transaction
      .select('id', 'type', 'created_at')
      .from<AutomationAction>('automation_actions');
    if (actions.length === 0) {
      return;
    }

    const emailDesignSetting = await this.transaction('email_design_settings')
      .select('id')
      .where('slug', DEFAULT_EMAIL_DESIGN_SETTING_SLUG)
      .first<{ id: string }>();
    if (!emailDesignSetting) {
      throw new errors.InternalServerError({
        message: `Missing email design setting: ${DEFAULT_EMAIL_DESIGN_SETTING_SLUG}`,
      });
    }
    this.#emailDesignSettingId = emailDesignSetting.id;

    await this.importForEach(actions, quantity / actions.length);
  }

  setReferencedModel(action: AutomationAction): void {
    this.#action = action;
    this.#revisionIndex = 0;
  }

  generate(): AutomationActionRevision {
    if (!this.#action) {
      throw new errors.IncorrectUsageError({
        message: 'Cannot generate automation action revision without an action',
      });
    }

    const createdAt = fromDatabaseDate(this.#action.created_at);
    createdAt.setSeconds(createdAt.getSeconds() + this.#revisionIndex);
    this.#revisionIndex += 1;

    const common = {
      id: this.fastFakeObjectId(),
      created_at: toDatabaseDate(createdAt),
      action_id: this.#action.id,
      email_sent_count: null,
      email_opened_count: null,
      email_clicked_count: null,
    };

    switch (this.#action.type) {
      case 'wait':
        return {
          ...common,
          wait_hours: faker.number.int({ min: 1, max: 30 }) * 24,
          email_subject: null,
          email_lexical: null,
          email_design_setting_id: null,
        };
      case 'send_email':
        if (!this.#emailDesignSettingId) {
          throw new errors.InternalServerError({
            message: `Missing email design setting: ${DEFAULT_EMAIL_DESIGN_SETTING_SLUG}`,
          });
        }
        const emailBody = faker.lorem.sentence();
        return {
          ...common,
          wait_hours: null,
          email_subject: faker.lorem.sentence(),
          email_design_setting_id: this.#emailDesignSettingId,
          email_lexical: JSON.stringify({
            root: {
              children: [
                {
                  children: [
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: emailBody,
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: null,
                  format: '',
                  indent: 0,
                  type: 'paragraph',
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              type: 'root',
              version: 1,
            },
          }),
        };
      default:
        throw new errors.IncorrectUsageError({
          message: `Unknown automation action type: ${this.#action.type}`,
        });
    }
  }
}
