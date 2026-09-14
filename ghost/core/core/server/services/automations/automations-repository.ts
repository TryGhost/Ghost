import type { ReadonlyDeep } from 'type-fest';
import type { Knex } from 'knex';
import type { AutomationTrigger } from './automation-trigger';

export type Pagination = {
  page: number;
  pages: number;
  limit: number | 'all';
  total: number;
  prev: number | null;
  next: number | null;
};

export type Page<T> = {
  data: T[];
  meta: {
    pagination: Pagination;
  };
};

export type WaitAction = {
  id: string;
  type: 'wait';
  data: {
    wait_hours: number;
  };
};

export type AutomationEmailStats = {
  email_clicked_count: number;
  email_sent_count: number;
  email_opened_count: number;
  opened_rate: number | null;
  clicked_rate: number | null;
};

export type AutomationActionLink = {
  url: string;
  clicked_count: number;
};

export type SendEmailAction = {
  id: string;
  type: 'send_email';
  data: {
    email_subject: string;
    email_lexical: string;
    email_design_setting_id: string;
  };
  stats?: AutomationEmailStats;
};

export type AutomationAction = WaitAction | SendEmailAction;

export type AutomationEdge = {
  source_action_id: string;
  target_action_id: string;
};

export type AutomationSummary = {
  id: string;
  /**
   * What makes members enter this automation.
   *
   * `null` means the automation's stored trigger could not be parsed, so no
   * member will ever enter it. This is not reachable through the API, which
   * validates triggers on the way in, but the database column is nullable and a
   * row could predate or outlive a trigger format.
   */
  trigger: AutomationTrigger | null;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AutomationBrowseResult = AutomationSummary & {
  stats?: {
    last_run_created_at: Date | null;
    total_run_count: number;
    in_progress_run_count: number;
  };
};

export type Automation = AutomationSummary & {
  actions: AutomationAction[];
  edges: AutomationEdge[];
};

export type EditAutomationData = {
  status: string;
  actions: AutomationAction[];
  edges: AutomationEdge[];
  /**
   * Omit to leave the automation's existing trigger untouched.
   */
  trigger?: AutomationTrigger;
};

export type AddAutomationData = {
  name: string;
  trigger: AutomationTrigger;
};

export type AutomatedEmailRecipientWithMailgunId = {
  id: string;
  mailgun_message_id: string;
  automation_action_revision_id: string;
};

export type AutomatedEmailEvents = {
  deliveredAt?: Date;
  openedAt?: Date;
  automationActionRevisionId: string;
};

export type RecordEmailSentOptions = Readonly<{
  automationActionRevisionId: string;
  automationRunStepId: string;
  mailgunMessageId?: string;
  memberEmail: string;
  memberId: string;
  memberName: string | null;
  memberUuid: string;
  trackClicks: boolean;
  trackOpens: boolean;
}>;

type AutomationStepBase = {
  id: string;
  locked_by: string;
  automation_run_id: string;
  automation_id: string;
  automation_trigger: AutomationTrigger | null;
  automation_status: 'inactive' | 'active';
  member_id: string | null;
  member_email: string;
  action_id: string;
  automation_action_revision_id: string;
  ready_at: Date;
  step_attempts: number;
};

export type AutomationStepToRun = ReadonlyDeep<
  AutomationStepBase &
    (
      | {
          type: 'wait';
          wait_hours: number;
        }
      | {
          type: 'send_email';
          email_subject: string;
          email_lexical: string;
          email_design_setting_id: string | null;
        }
    )
>;

export type AutomationStepTerminalStatus =
  | 'automation disabled'
  | 'failed'
  | 'finished'
  | 'member changed status'
  | 'member unsubscribed';

export type BrowseOptions = Readonly<{
  /**
   * Should stats be included?
   *
   * In the future, we plan to remove this option and never return stats from the database repository.
   */
  includeStats: boolean;
}>;

export type AutomationsRepository = {
  browse(options: BrowseOptions): Promise<Page<AutomationBrowseResult>>;
  add(data: AddAutomationData): Promise<Automation>;
  getById(id: string): Promise<Automation | null>;
  getAutomationActionLinks(
    automationId: string,
    actionId: string,
  ): Promise<AutomationActionLink[] | null>;
  edit(id: string, data: EditAutomationData): Promise<Automation | null>;
  /**
   * Enqueue a run of every active automation whose trigger matches the member.
   *
   * Triggers may overlap, so one call can start several automations.
   */
  trigger(options: {
    memberEmail: string;
    memberId: string;
    memberStatus: string;
    /**
     * The tiers that made the member eligible right now — the ones they just
     * gained, not every tier they hold. Empty for free signups.
     */
    tierIds: ReadonlyArray<string>;
  }): Promise<void>;
  /**
   * Select the steps we want to run and return the next time any remaining
   * pending step should be polled, if any.
   *
   * If we could guarantee this function would only be called once ever, it'd
   * be pretty simple! However, we want to handle cases where this function is
   * called multiple times simultaneously (maybe in different processes
   * querying the same database). That's why we implement a row-level locking
   * mechanism, hence the word "lock" in the name of this function.
   */
  fetchAndLockSteps(limit: number): Promise<{
    steps: AutomationStepToRun[];
    nextStepReadyAt: Date | null;
  }>;
  /**
   * Atomically finish a locked step and create the next one so concurrent
   * runners cannot enqueue duplicates.
   *
   * Returns the next step's ready time, or null if no next step was created.
   */
  finishStepAndEnqueueNext(
    step: Pick<AutomationStepToRun, 'id' | 'locked_by' | 'action_id' | 'automation_run_id'>,
  ): Promise<Date | null>;
  /**
   * Stop a locked step without continuing the automation, preserving the
   * reason it ended.
   *
   * Returns whether the step was updated.
   */
  markStepTerminal(
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    status: AutomationStepTerminalStatus,
  ): Promise<boolean>;
  /**
   * Put a locked step back in the queue for another attempt.
   *
   * Returns whether the step was updated.
   */
  retryStep(
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    retryAt: Readonly<Date>,
  ): Promise<boolean>;
  /**
   * Record a sent email and increment its action revision's sent count.
   */
  recordEmailSent(options: RecordEmailSentOptions): Promise<void>;
  /**
   * Fetch sent emails by their Mailgun IDs.
   */
  getAutomatedEmailRecipientsByMailgunIds(
    mailgunMessageIds: ReadonlyArray<string>,
  ): Promise<AutomatedEmailRecipientWithMailgunId[]>;
  /**
   * Track delivery and open events.
   */
  trackEmailDeliveredAndOpened(
    eventsByAutomatedEmailRecipientId: ReadonlyDeep<Map<string, AutomatedEmailEvents>>,
  ): Promise<void>;
  /**
   * Record the first click timestamp for the automated email recipient identified by a run step.
   *
   */
  trackEmailClicked(
    options: {
      automationActionRevisionId: string;
      automationRunStepId: string;
      memberId: string;
      clickedAt: Readonly<Date>;
    },
    transactionOptions?: {
      transacting?: Knex.Transaction;
    },
  ): Promise<void>;
};
