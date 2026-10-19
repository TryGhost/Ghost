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

export type LabelTriggerRow = {
  automation_id: string;
  label_id: string;
  starts_at: Date;
  checked_until: Date | null;
};

export type LabelAddedRow = {
  /** The `members_labels` row ID. */
  id: string;
  created_at: Date;
  member_id: string;
  member_email: string;
};

export type MemberRow = {
  id: string;
  email: string;
  name: string | null;
  uuid: string;
  status: string;
  enable_updates_and_announcements: boolean | null;
};

export type MemberRelationRow = {
  member_id: string;
  related_id: string;
};

export type NextActionRevisionRow = {
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
  /** Find the first action revision for all automations that match these trigger criteria. */
  findFirstActionRevisions: (
    connection: Connection,
    memberStatus: 'free' | 'paid',
    memberTierIds: ReadonlyArray<string>,
  ) => Promisable<NextActionRevisionRow[]>;

  /** Find the first action revision for one automation, regardless of its status. */
  findFirstActionRevisionForAutomation: (
    connection: Connection,
    automationId: string,
  ) => Promisable<null | NextActionRevisionRow>;

  /** Find the trigger labels of all active "label added" automations. */
  findActiveLabelTriggers: (connection: Connection) => Promisable<LabelTriggerRow[]>;

  /**
   * Find members who had a label added in a time range and haven't entered
   * this automation. Results are ordered by when the label was added, then by
   * `members_labels` ID; pass the last result as `after` to get the next page.
   */
  findMembersWithLabelAdded: (
    connection: Connection,
    options: Readonly<{
      automationId: string;
      labelId: string;
      from: Readonly<Date>;
      to: Readonly<Date>;
      after: null | Readonly<Pick<LabelAddedRow, 'id' | 'created_at'>>;
      limit: number;
    }>,
  ) => Promisable<LabelAddedRow[]>;

  /** Find members by ID. */
  findMembers: (
    connection: Connection,
    memberIds: ReadonlyArray<string>,
  ) => Promisable<MemberRow[]>;

  /** Find the labels of these members. */
  findMemberLabels: (
    connection: Connection,
    memberIds: ReadonlyArray<string>,
  ) => Promisable<MemberRelationRow[]>;

  /** Find the newsletters these members are subscribed to. */
  findMemberNewsletters: (
    connection: Connection,
    memberIds: ReadonlyArray<string>,
  ) => Promisable<MemberRelationRow[]>;

  /** Find the tiers of these members. */
  findMemberTiers: (
    connection: Connection,
    memberIds: ReadonlyArray<string>,
  ) => Promisable<MemberRelationRow[]>;

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
   * Lock an automation for the lifetime of this transaction, returning whether
   * it's an active "label added" automation.
   */
  lockActiveLabelAddedAutomation: (
    connection: Connection,
    automationId: string,
  ) => Promisable<boolean>;

  /**
   * Lock a member for the lifetime of this transaction. Useful to make sure a
   * member doesn't change during an operation.
   */
  lockMember: (connection: Connection, memberId: string) => Promisable<void>;

  /** Record that a trigger label has been checked for label additions up to a time. */
  setLabelTriggerCheckedUntil: (
    connection: Connection,
    automationId: string,
    labelId: string,
    checkedUntil: Readonly<Date>,
  ) => Promisable<void>;

  /** Run a function within a repository connection. */
  withConnection: <ReturnT>(fn: (connection: Connection) => ReturnT) => ReturnT;

  /** Run a function within a repository transaction. */
  withTransaction: <ReturnT>(fn: (transaction: Connection) => ReturnT) => Promisable<ReturnT>;
};
