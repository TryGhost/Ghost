import type { Knex } from 'knex';
import { TableImporter } from './table-importer';

type AutomationAction = {
  id: string;
  automation_id: string;
  created_at: string;
};

type AutomationActionEdge = {
  source_action_id: string;
  target_action_id: string;
};

export class AutomationActionEdgesImporter extends TableImporter<AutomationActionEdge> {
  static table = 'automation_action_edges';
  static dependencies = ['automation_actions'];

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(AutomationActionEdgesImporter.table, knex, transaction);
  }

  async import(): Promise<void> {
    const actions = await this.transaction
      .select('id', 'automation_id', 'created_at')
      .from<AutomationAction>('automation_actions')
      .orderBy('automation_id')
      .orderBy('created_at')
      .orderBy('id');

    const actionsByAutomation = new Map<string, AutomationAction[]>();
    for (const action of actions) {
      const automationActions = actionsByAutomation.get(action.automation_id) ?? [];
      automationActions.push(action);
      actionsByAutomation.set(action.automation_id, automationActions);
    }

    const edges: AutomationActionEdge[] = [];
    for (const automationActions of actionsByAutomation.values()) {
      for (let index = 1; index < automationActions.length; index += 1) {
        edges.push({
          source_action_id: automationActions[index - 1].id,
          target_action_id: automationActions[index].id,
        });
      }
    }

    if (edges.length > 0) {
      await this.batchInsert(edges);
    }
  }
}
