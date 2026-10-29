import type { AutomationTriggerRule } from './trigger-rules';
import type { Promisable } from 'type-fest';
import type { z } from 'zod';
import { addAutomationDataSchema } from './automations-schemas';

export type AutomationTriggerTierScope = 'free' | 'all_paid' | 'selected_paid';

export type AddAutomationData = z.infer<typeof addAutomationDataSchema>;

export type ActionToInsert = {
  id: string;
  created_at: Date;
  updated_at: Date;
  automation_id: string;
  type: 'wait' | 'send_email';
};

export type EdgeRow = {
  source_action_id: string;
  target_action_id: string;
};

export type RunStepToInsert = {
  id: string;
  created_at: Date;
  updated_at: Date;
  automation_run_id: string;
  automation_action_revision_id: string;
  ready_at: Date;
};

export type RunToInsert = {
  id: string;
  created_at: Date;
  updated_at: Date;
  automation_id: string;
  member_id: string;
  member_email: string;
};

type NextActionRevisionRow = {
  automation_id: string;
  action_id: string;
  automation_action_revision_id: string;
} & ({ type: 'wait'; wait_hours: number } | { type: 'send_email' });

/**
 * Data storage abstraction for automations.
 *
 * Implementations of this interface should have limited logic. Each should
 * roughly correspond to one database query. Logic should live in callers.
 *
 * NOTE: `AutomationsRepository2` will soon subsume `AutomationsRepository`. See NY-1704.
 */
export type AutomationsRepository2<Connection> = {
  /** Delete all trigger rules for an automation. */
  deleteTriggerRules: (connection: Connection, automationId: string) => Promisable<void>;

  /** Find the first action revision for all automations that match these trigger criteria. */
  findFirstActionRevisions: (
    connection: Connection,
    memberStatus: 'free' | 'paid',
    memberTierIds: ReadonlyArray<string>,
  ) => Promisable<NextActionRevisionRow[]>;

  /** Get the count of all automations. */
  getNumberOfAutomations: (connection: Connection) => Promisable<number>;

  /** Has this member ever entered this automation? */
  hasMemberEnteredAutomation: (
    connection: Connection,
    automationId: string,
    memberId: string,
  ) => Promisable<boolean>;

  /** Insert automation actions. */
  insertActions: (
    connection: Connection,
    toInsert: ReadonlyArray<ActionToInsert>,
  ) => Promisable<void>;

  /** Insert automation run steps. Typically coupled with the insertion of an equal number of runs. */
  insertRunSteps: (
    connection: Connection,
    toInsert: ReadonlyArray<RunStepToInsert>,
  ) => Promisable<void>;

  /** Insert automation runs. Typically coupled with the insertion of an equal number of steps. */
  insertRuns: (connection: Connection, toInsert: ReadonlyArray<RunToInsert>) => Promisable<void>;

  /** Insert automation trigger rules. */
  insertTriggerRules: (
    connection: Connection,
    toInsert: ReadonlyArray<AutomationTriggerRule>,
  ) => Promisable<void>;

  /** Is this run's automation active? */
  isAutomationActiveForRun: (
    connection: Connection,
    automationRunId: string,
  ) => Promisable<boolean>;

  /** Is this step's automation active? */
  isAutomationActiveForRunStep: (connection: Connection, runStepId: string) => Promisable<boolean>;

  /** Load the edges connecting (non-deleted) actions. */
  loadEdgeRows: (connection: Connection, automationId: string) => Promisable<EdgeRow[]>;

  /**
   * Lock a member for the lifetime of this transaction. Useful to make sure a
   * member doesn't change during an operation.
   */
  lockMember: (connection: Connection, memberId: string) => Promisable<void>;

  /** Run a function within a repository connection. */
  withConnection: <ReturnT>(fn: (connection: Connection) => ReturnT) => ReturnT;

  /** Run a function within a repository transaction. */
  withTransaction: <ReturnT>(fn: (transaction: Connection) => ReturnT) => Promisable<ReturnT>;
};
