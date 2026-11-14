import type { Knex } from 'knex';
import { ensureTransaction } from '../../lib/ensure-transaction';
import { Action, type ActionWriter, type NewAction } from './models';
import type { ActionsPage, Pagination } from './serializers';

/** What a reader of the action log may ask for. */
export interface BrowseActions {
  page?: number | string;
  limit?: number | string;
  /** An NQL filter over an action's stored fields. */
  filter?: string;
  /** The relations to load with each action: its actor, its resource, or both. */
  withRelated?: string[];
  /** Who is reading, as the API framework describes them. */
  context?: unknown;
  /** Applied to the parsed filter before it is run, to refuse fields a reader may not filter by. */
  mongoTransformer?: (filter: unknown) => unknown;
}

/** The part of the Bookshelf `Action` model the action log uses. */
export interface ActionModel {
  findPage(
    options: BrowseActions & { transacting: Knex.Transaction },
  ): Promise<{ data: Array<{ toJSON(): unknown }>; meta: { pagination: Pagination } }>;
  add(
    action: NewAction,
    options: { transacting: Knex.Transaction; autoRefresh: false },
  ): Promise<unknown>;
}

/**
 * The action log: the record of what staff users and integrations did, stored in the `actions`
 * table and shown by Admin's History page.
 *
 * It reads and writes through the Bookshelf `Action` model, and is where an action gets its
 * types: only an action one of the declared kinds allows can be written, and what is read is
 * checked against `Action`.
 *
 * Bookshelf models log their own actions through the model's `add`, after their transaction
 * commits. They do not go through `write`.
 */
export class ActionLogService implements ActionWriter {
  private knex: Knex;
  private Action: ActionModel;

  constructor({ knex, Action: model }: { knex: Knex; Action: ActionModel }) {
    this.knex = knex;
    this.Action = model;
  }

  /**
   * Reads one page of the log, newest action first.
   *
   * Read in one transaction, as the page, its count and each action's actor and resource are
   * separate queries. Given a transaction as `executor` it reads inside that transaction; given
   * a plain connection it opens its own.
   */
  async browse(options: BrowseActions = {}, executor: Knex = this.knex): Promise<ActionsPage> {
    return ensureTransaction(executor, async (trx) => {
      const page = await this.Action.findPage({ ...options, transacting: trx });
      return {
        actions: page.data.map((model) => Action.parse(model.toJSON())),
        pagination: page.meta.pagination,
      };
    });
  }

  /**
   * Stores an action.
   *
   * Given the transaction of the command the action records as `executor`, it joins that
   * transaction: the action is saved when the command's change is saved and never without it,
   * and a failed write fails the command unless the caller catches it. Given a plain connection
   * it opens its own. The caller logs a failure, as only it knows which command failed.
   */
  async write(action: NewAction, executor: Knex = this.knex): Promise<void> {
    await ensureTransaction(executor, (trx) =>
      this.Action.add(action, { transacting: trx, autoRefresh: false }),
    );
  }
}
