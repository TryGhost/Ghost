import errors from '@tryghost/errors';
import type { Site } from '#support/site';
import { membersApi } from '../../../shared/transition/members-api';
import { models } from '../../../shared/transition/models';
import { settingsCache } from '../../../shared/transition/settings-cache';
import { verificationWebhook } from '../../../shared/transition/verification-webhook';
import { recentEmailRecipients } from '../repositories/recent-email-recipients.repository';

const messages = {
  emailVerificationNeeded: `We're hard at work processing your import. To make sure you get great deliverability, we'll need to enable some extra features for your account. A member of our team will be in touch by email to review your account and make sure everything is configured correctly so you're ready to go.`,
};

type Method = 'admin' | 'api' | 'import' | 'removed_recipients';

type SignupEventsPage = {
  data: unknown[];
  meta: { pagination: { total: number; limit: number } };
};

/** A threshold that is not set in config is read as undefined, and is never reached. */
type Threshold = () => number | undefined;

export type VerificationTriggerDeps = {
  /** Threshold for triggering API sourced verifications */
  getApiTriggerThreshold: Threshold;
  /** Threshold for triggering Admin sourced verifications */
  getAdminTriggerThreshold: Threshold;
  /** Threshold for triggering Import sourced verifications */
  getImportTriggerThreshold: Threshold;
  /** Threshold for triggering on recent newsletter recipients who are no longer members */
  getRemovedRecipientsThreshold?: Threshold;
  /** Check Ghost config to see if we are already verified */
  isVerified: () => boolean;
  /** Check Ghost settings to see whether verification has been requested */
  isVerificationRequired: () => boolean;
  /** Directly update the settings cache for email_verification_required */
  setVerificationRequired?: (value: boolean) => void;
  /** Sends a webhook to the escalation service to confirm that customer needs to be verified */
  sendVerificationWebhook?: (content: {
    amountTriggered: number;
    threshold: number;
    method: Method;
  }) => Promise<boolean>;
  /** Ghost Settings model */
  Settings: { edit(data: unknown, options: unknown): Promise<unknown> };
  /** For querying events */
  eventRepository: { getSignupEvents(options: object, filter: object): Promise<SignupEventsPage> };
  /** Sums newsletter recipients since the given date */
  countRecentEmailRecipients?: (since: string) => Promise<number>;
  /** Counts, up to the limit, recipients since the given date whose address no longer belongs to a member */
  countRemovedEmailRecipients?: (since: string, limit: number) => Promise<number>;
};

/** What a member-created event must carry for the trigger to act on it. */
export type MemberCreated = { data?: { source?: string } };

export type VerificationResult = {
  /** Whether the verification workflow was triggered */
  needsVerification: boolean;
};

export class VerificationTrigger {
  _getApiTriggerThreshold: Threshold;
  _getAdminTriggerThreshold: Threshold;
  _getImportTriggerThreshold: Threshold;
  _getRemovedRecipientsThreshold: Threshold;
  _isVerified: VerificationTriggerDeps['isVerified'];
  _isVerificationRequired: VerificationTriggerDeps['isVerificationRequired'];
  _setVerificationRequired: NonNullable<VerificationTriggerDeps['setVerificationRequired']>;
  _sendVerificationWebhook: NonNullable<VerificationTriggerDeps['sendVerificationWebhook']>;
  _Settings: VerificationTriggerDeps['Settings'];
  _eventRepository: VerificationTriggerDeps['eventRepository'];
  _countRecentEmailRecipients: VerificationTriggerDeps['countRecentEmailRecipients'];
  _countRemovedEmailRecipients: VerificationTriggerDeps['countRemovedEmailRecipients'];

  // It no longer subscribes to member-created events itself. The hosting provider
  // lists a listener, which asks isVerified as the constructor used to.
  constructor({
    getApiTriggerThreshold,
    getAdminTriggerThreshold,
    getImportTriggerThreshold,
    getRemovedRecipientsThreshold,
    isVerified,
    isVerificationRequired,
    setVerificationRequired,
    sendVerificationWebhook,
    Settings,
    eventRepository,
    countRecentEmailRecipients,
    countRemovedEmailRecipients,
  }: VerificationTriggerDeps) {
    this._getApiTriggerThreshold = getApiTriggerThreshold;
    this._getAdminTriggerThreshold = getAdminTriggerThreshold;
    this._getImportTriggerThreshold = getImportTriggerThreshold;
    this._getRemovedRecipientsThreshold = getRemovedRecipientsThreshold || (() => Infinity);
    this._isVerified = isVerified;
    this._isVerificationRequired = isVerificationRequired;
    this._setVerificationRequired = setVerificationRequired || (() => {});
    this._sendVerificationWebhook = sendVerificationWebhook || (async () => false);
    this._Settings = Settings;
    this._eventRepository = eventRepository;
    this._countRecentEmailRecipients = countRecentEmailRecipients;
    this._countRemovedEmailRecipients = countRemovedEmailRecipients;
  }

  /** Whether the host has already verified this site, which nothing here then checks again. */
  isVerified(): boolean {
    return this._isVerified();
  }

  get _apiTriggerThreshold() {
    return this._getApiTriggerThreshold();
  }

  get _adminTriggerThreshold() {
    return this._getAdminTriggerThreshold();
  }

  get _importTriggerThreshold() {
    return this._getImportTriggerThreshold();
  }

  get _removedRecipientsThreshold() {
    return this._getRemovedRecipientsThreshold();
  }

  async handleMemberCreated(event: MemberCreated): Promise<void> {
    const source = event.data?.source;
    let sourceThreshold: number | undefined;

    if (source === 'api') {
      sourceThreshold = this._apiTriggerThreshold;
    } else if (source === 'admin') {
      sourceThreshold = this._adminTriggerThreshold;
    }

    if (
      (source === 'api' || source === 'admin') &&
      sourceThreshold !== undefined &&
      Number.isFinite(sourceThreshold)
    ) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 30);
      const events = await this._eventRepository.getSignupEvents(
        {},
        {
          source,
          created_at: {
            $gt: createdAt.toISOString().replace('T', ' ').substring(0, 19),
          },
        },
      );

      // TODO: Fix off-by-one issue in event dispatch: https://linear.app/ghost/issue/BER-3507/off-by-one-errors-in-event-query-pagination
      const addOneForCurrentEvent =
        events.meta.pagination.total < events.meta.pagination.limit &&
        events.data.length !== events.meta.pagination.total;
      const currentImport = events.meta.pagination.total + (addOneForCurrentEvent ? 1 : 0);

      const membersTotal = (
        await this._eventRepository.getSignupEvents(
          {},
          {
            source: 'member',
          },
        )
      ).meta.pagination.total;

      const effectiveThreshold = Math.max(sourceThreshold, membersTotal);

      if (currentImport > effectiveThreshold) {
        await this._startVerificationProcess({
          amount: currentImport,
          threshold: effectiveThreshold,
          method: source,
          throwOnTrigger: false,
          source: source,
        });
      }
    }
  }

  async _markVerificationRequired() {
    await this._Settings.edit(
      [
        {
          key: 'email_verification_required',
          value: true,
        },
      ],
      { context: { internal: true } },
    );

    // Explicitly update the cache regardless of whether the DB value changed.
    // Settings.edit relies on Bookshelf's hasChanged() to fire onUpdated, which
    // skips the model event (and therefore the cache update) when the DB already
    // holds the same value — e.g. after a previous verification cycle.
    this._setVerificationRequired(true);
  }

  _finishTrigger(throwOnTrigger: boolean): VerificationResult {
    if (throwOnTrigger) {
      throw new errors.HostLimitError({
        message: messages.emailVerificationNeeded,
        code: 'EMAIL_VERIFICATION_NEEDED',
      });
    }

    return {
      needsVerification: true,
    };
  }

  async getImportThreshold(): Promise<number | undefined> {
    const volumeThreshold = this._importTriggerThreshold;
    if (volumeThreshold === undefined || !Number.isFinite(volumeThreshold)) {
      return volumeThreshold;
    }

    const membersTotal = (
      await this._eventRepository.getSignupEvents(
        {},
        {
          source: 'member',
        },
      )
    ).meta.pagination.total;
    return Math.max(membersTotal, volumeThreshold);
  }

  /**
   * Returns false if email verification is required to send an email. It also updates the verification check and might activate email verification.
   * Use this when sending emails.
   *
   * `newsletterSend` also runs the checks that are only worth their cost before a newsletter send.
   */
  async checkVerificationRequired({
    newsletterSend = false,
  }: { newsletterSend?: boolean } = {}): Promise<boolean> {
    // Check if import threshold is reached (could happen that a long import is in progress and we didn't check the threshold yet)
    await this.testImportThreshold();
    if (newsletterSend) {
      await this.testRemovedRecipientsThreshold();
    }
    return this._isVerificationRequired() && !this._isVerified();
  }

  /**
   * Catches newsletters sent to members who are then deleted or have their address changed, which
   * lets a site email far more people than it keeps as members without adding to any other count
   */
  async testRemovedRecipientsThreshold(): Promise<void> {
    const threshold = this._removedRecipientsThreshold;
    if (threshold === undefined || !Number.isFinite(threshold)) {
      return;
    }

    if (this._isVerified() || this._isVerificationRequired()) {
      return;
    }

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 30);
    const since = createdAt.toISOString().replace('T', ' ').substring(0, 19);

    // Cheap bound first: fewer recipients in total than the threshold can't have enough removed ones
    if ((await this._countRecentEmailRecipients!(since)) <= threshold) {
      return;
    }

    const removedRecipients = await this._countRemovedEmailRecipients!(since, threshold + 1);
    if (removedRecipients > threshold) {
      await this._startVerificationProcess({
        amount: removedRecipients,
        threshold,
        method: 'removed_recipients',
        throwOnTrigger: false,
        source: 'removed_recipients',
      });
    }
  }

  async testImportThreshold(): Promise<void> {
    if (!Number.isFinite(this._importTriggerThreshold)) {
      // Infinite threshold, quick path
      return;
    }

    if (this._isVerified()) {
      // Already verified, no need to check limits
      return;
    }

    if (this._isVerificationRequired()) {
      // Already requested verification, no need to calculate again
      return;
    }

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 30);
    const events = await this._eventRepository.getSignupEvents(
      {},
      {
        source: 'import',
        created_at: {
          $gt: createdAt.toISOString().replace('T', ' ').substring(0, 19),
        },
      },
    );

    const currentImport = events.meta.pagination.total;

    const membersTotal = (
      await this._eventRepository.getSignupEvents(
        {},
        {
          source: 'member',
        },
      )
    ).meta.pagination.total;

    // Import threshold is either the total number of members (discounting any created by imports in
    // the last 30 days) or the threshold defined in config, whichever is greater.
    const importThreshold = Math.max(
      membersTotal - currentImport,
      // Read again, as it always was. It was finite a moment ago.
      this._importTriggerThreshold as number,
    );
    if (Number.isFinite(importThreshold) && currentImport > importThreshold) {
      await this._startVerificationProcess({
        amount: currentImport,
        threshold: importThreshold,
        method: 'import',
        throwOnTrigger: false,
        source: 'import',
      });
    }
  }

  /**
   * `amount` is the number of members that triggered the verification process, `threshold`
   * the threshold that was exceeded, and `method` the source that triggered verification.
   * `throwOnTrigger` says whether to throw if verification is needed.
   */
  async _startVerificationProcess({
    amount,
    threshold,
    method,
    throwOnTrigger,
    source,
  }: {
    amount: number;
    threshold?: number;
    method?: Method;
    throwOnTrigger: boolean;
    source?: Method;
  }): Promise<VerificationResult> {
    if (this._isVerified()) {
      return { needsVerification: false };
    }

    // Only trigger verification once.
    if (this._isVerificationRequired()) {
      return { needsVerification: false };
    }

    let webhookWasSent = false;

    try {
      webhookWasSent = await this._sendVerificationWebhook({
        amountTriggered: amount,
        threshold: threshold ?? amount,
        method: method ?? source ?? 'import',
      });
    } catch {
      // `sendVerificationWebhook` already logs delivery failures.
      return { needsVerification: false };
    }

    if (!webhookWasSent) {
      return { needsVerification: false };
    }

    await this._markVerificationRequired();
    return this._finishTrigger(throwOnTrigger);
  }
}

const configuredThreshold = (site: Site, key: string): number | undefined =>
  (site.config.get('hostSettings') as { emailVerification?: Record<string, number> } | undefined)
    ?.emailVerification?.[key];

// What legacy modules hold is asked for when it is used, not when this is built:
// members and the database are ready by then, and nothing connects before it must.
export const verificationTrigger = (site: Site) => {
  const webhook = verificationWebhook(site);
  return new VerificationTrigger({
    getApiTriggerThreshold: () => configuredThreshold(site, 'apiThreshold'),
    getAdminTriggerThreshold: () => configuredThreshold(site, 'adminThreshold'),
    getImportTriggerThreshold: () => configuredThreshold(site, 'importThreshold'),
    getRemovedRecipientsThreshold: () => configuredThreshold(site, 'removedRecipientsThreshold'),
    isVerified: () => site.config.get('hostSettings:emailVerification:verified') === true,
    isVerificationRequired: () => settingsCache(site).get('email_verification_required') === true,
    setVerificationRequired: (value) =>
      // The cache's types ask for the key again beside the value. It has always been set without.
      settingsCache(site).set('email_verification_required', { value } as never),
    sendVerificationWebhook: webhook.sendVerificationWebhook.bind(webhook),
    Settings: models(site).Settings,
    eventRepository: {
      getSignupEvents: (options, filter) =>
        membersApi(site).events.getSignupEvents(options, filter),
    },
    countRecentEmailRecipients: (since) => recentEmailRecipients(site).countSince(since),
    countRemovedEmailRecipients: (since, limit) =>
      recentEmailRecipients(site).countRemovedSince(since, limit),
  });
};
