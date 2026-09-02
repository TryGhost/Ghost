import {
  EVERYONE_RECIPIENT_FILTER,
  PAID_SEGMENT,
  getFullRecipientFilter,
  getNewsletterRecipientFilter,
} from '@tryghost/admin-x-framework/utils/recipient-filter';
import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';
import type {
  PublishOptions as PublishCommandOptions,
  ScheduleOptions as ScheduleCommandOptions,
} from '@/editor/engine/save-engine';

/** The server rejects a schedule in the past; the picker floor sits just ahead of now. */
export const MIN_SCHEDULE_LEAD_MS = 5 * 1000;
export const DEFAULT_SCHEDULE_LEAD_MS = 10 * 60 * 1000;

export const EMAIL_VERIFICATION_HOLD_MESSAGE =
  'Email sending is temporarily disabled because your account is currently in review. You should have an email about this from us already, but you can also reach us any time at support@ghost.org.';

const UPGRADE_PHRASE = /please upgrade/i;

export type PublishType = 'publish+send' | 'publish' | 'send';

export interface PublishTypeOption {
  value: PublishType;
  /** Shown in the expanded options list. */
  label: string;
  /** Shown in the collapsed option title. */
  display: string;
  disabled: boolean;
}

export interface PublishPostInput {
  status: PostStatus;
  /** Pages never email. */
  isPage?: boolean;
  visibility?: string | null;
  tiers?: ReadonlyArray<{ slug: string }>;
  /** The post's persisted newsletter slug; pairs with `emailSegment` for the initial filter. */
  newsletter?: string | null;
  emailSegment?: string | null;
  /** The post's email record, if one was ever created. */
  email?: { status?: string | null } | null;
}

export interface NewsletterInput {
  slug: string;
  name?: string;
  /** Only `active` newsletters are selectable. */
  status?: string;
  visibility?: string;
  sortOrder?: number;
}

export type DefaultEmailRecipients = 'disabled' | 'visibility' | 'filter';

export interface PublishSiteInput {
  /** False when members signup access is `none`. */
  membersEnabled: boolean;
  mailgunConfigured: boolean;
  editorDefaultEmailRecipients: DefaultEmailRecipients;
  editorDefaultEmailRecipientsFilter: string | null;
  /** Read for admins only; null when the count could not be read, and treated as "has members". */
  memberCount: number | null;
  newsletters: ReadonlyArray<NewsletterInput>;
}

export interface PublishUserInput {
  /** Only admins and owners can read the member count and the publishing limit. */
  isAdmin: boolean;
  /** Authors and contributors cannot browse emails, so the sending limit is not evaluated for them. */
  isAuthorOrContributor: boolean;
}

export interface EmailVerificationHold {
  required: boolean;
  /** Host-specific copy; the default hold message is used when absent. */
  message?: string | null;
}

export interface PublishLimitPorts {
  /** Awaited before the sending checks so a fresh hold is seen. A rejection propagates. */
  refreshSettings?: () => Promise<void>;
  /** Resolves when sending is allowed; rejects with the host's message when the email limit would be exceeded. */
  checkSendingLimit?: () => Promise<void>;
  /** Resolves when publishing is allowed; rejects with the host's message when over the member limit. */
  checkPublishingLimit?: () => Promise<void>;
  /** Read after `refreshSettings`. */
  getEmailVerification?: () => EmailVerificationHold;
}

export interface LimitMessagePart {
  text: string;
  /** `upgrade` marks the phrase to render as an upgrade link. */
  kind: 'text' | 'upgrade';
}

export interface EmailBlock {
  kind: 'sending-limit' | 'email-verification';
  message: string;
}

export interface PublishBlock {
  kind: 'host-limit';
  message: string;
  parts: LimitMessagePart[];
}

export interface PublishLimits {
  emailBlock: EmailBlock | null;
  publishBlock: PublishBlock | null;
}

export type EmailUnavailableReason = 'page' | 'already-emailed' | 'disabled-in-settings';

export type EmailDisabledReason =
  | 'no-mailgun'
  | 'no-members'
  | 'no-newsletter'
  | 'sending-limit'
  | 'email-verification';

export interface PublishOptionsState {
  readonly publishType: PublishType;
  readonly publishTypeOptions: readonly PublishTypeOption[];
  readonly availablePublishTypes: readonly PublishType[];
  readonly isScheduled: boolean;
  /** ISO 8601, milliseconds zeroed. */
  readonly scheduledAt: string;
  /** The earliest time the picker may offer, recomputed on every read. */
  readonly minScheduledAt: string;
  readonly newsletter: NewsletterInput | null;
  /** Active newsletters in sort order. */
  readonly newsletters: readonly NewsletterInput[];
  readonly onlyDefaultNewsletter: boolean;
  readonly recipientFilter: string | null;
  /** The newsletter audience AND-ed with the recipient filter; null without a newsletter. */
  readonly fullRecipientFilter: string | null;
  readonly willEmail: boolean;
  readonly willEmailImmediately: boolean;
  readonly willPublish: boolean;
  readonly willOnlyEmail: boolean;
  readonly emailUnavailable: boolean;
  readonly emailUnavailableReason: EmailUnavailableReason | null;
  readonly emailDisabled: boolean;
  readonly emailDisabledReason: EmailDisabledReason | null;
  readonly emailBlock: EmailBlock | null;
  readonly publishBlock: PublishBlock | null;
  /** Draft-only, and false when email-only has no executable email. */
  readonly canPublish: boolean;
  readonly isDirty: boolean;
}

export type PublishDispatch =
  | { kind: 'publish'; options: PublishCommandOptions }
  | { kind: 'schedule'; options: ScheduleCommandOptions }
  | { kind: 'revert' };

export interface PublishOptionsMachine {
  getState(): PublishOptionsState;
  setPublishType(publishType: PublishType): void;
  setIsScheduled(shouldSchedule?: boolean): void;
  setScheduledAt(date: string | Date): void;
  resetPastScheduledAt(): void;
  setNewsletter(newsletter: NewsletterInput | null): void;
  setRecipientFilter(filter: string | null): void;
  reset(): void;
  checkLimits(): Promise<PublishLimits>;
  /** Null when no safe status transition is on offer. */
  toDispatch(): PublishDispatch | null;
  toRevertDispatch(): PublishDispatch;
}

export interface PublishOptionsInputs {
  post: PublishPostInput;
  site: PublishSiteInput;
  user: PublishUserInput;
  limits?: PublishLimitPorts;
  now?: () => Date;
}

function zeroMilliseconds(time: number): string {
  return new Date(time - (time % 1000)).toISOString();
}

function isBefore(iso: string, other: string): boolean {
  return Date.parse(iso) < Date.parse(other);
}

export function selectableNewsletters(
  newsletters: ReadonlyArray<NewsletterInput>,
): NewsletterInput[] {
  return newsletters
    .filter((newsletter) => newsletter.status === 'active')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** The tier list spelled as a recipient filter; null when the post has no tiers. */
export function tiersSegment(tiers: ReadonlyArray<{ slug: string }>): string | null {
  return tiers.map((tier) => `tier:${tier.slug}`).join(',') || null;
}

/** Expands the API's legacy segment sentinels into the filters used by the editor. */
export function normalizeRecipientFilter(filter: string | null | undefined): string | null {
  if (filter === 'all') {
    return EVERYONE_RECIPIENT_FILTER;
  }
  if (!filter || filter === 'none') {
    return null;
  }
  return filter;
}

export function getDefaultRecipientFilter(
  post: PublishPostInput,
  site: Pick<
    PublishSiteInput,
    'editorDefaultEmailRecipients' | 'editorDefaultEmailRecipientsFilter'
  >,
): string | null {
  const recipients = site.editorDefaultEmailRecipients;
  const filter = normalizeRecipientFilter(site.editorDefaultEmailRecipientsFilter);
  const usuallyNobody = recipients === 'filter' && filter === null;

  if (recipients === 'disabled') {
    return null;
  }

  if (recipients === 'visibility' || usuallyNobody) {
    switch (post.visibility) {
      case 'public':
      case 'members':
        return EVERYONE_RECIPIENT_FILTER;
      case 'paid':
        return PAID_SEGMENT;
      case 'tiers':
        return tiersSegment(post.tiers ?? []);
      default:
        return post.visibility ?? null;
    }
  }

  return filter;
}

export function getEmailUnavailableReason(
  post: PublishPostInput,
  site: Pick<PublishSiteInput, 'membersEnabled' | 'editorDefaultEmailRecipients'>,
): EmailUnavailableReason | null {
  if (post.isPage) {
    return 'page';
  }
  if (post.email) {
    return 'already-emailed';
  }
  if (site.editorDefaultEmailRecipients === 'disabled' || !site.membersEnabled) {
    return 'disabled-in-settings';
  }
  return null;
}

export function getEmailDisabledReason(
  { mailgunConfigured, memberCount }: Pick<PublishSiteInput, 'mailgunConfigured' | 'memberCount'>,
  emailBlock: EmailBlock | null,
  hasNewsletter: boolean,
): EmailDisabledReason | null {
  if (!mailgunConfigured) {
    return 'no-mailgun';
  }
  if (memberCount === 0) {
    return 'no-members';
  }
  if (!hasNewsletter) {
    return 'no-newsletter';
  }
  return emailBlock?.kind ?? null;
}

export function getInitialPublishType(
  post: PublishPostInput,
  site: Pick<
    PublishSiteInput,
    'editorDefaultEmailRecipients' | 'editorDefaultEmailRecipientsFilter'
  >,
  { emailUnavailable, emailDisabled }: { emailUnavailable: boolean; emailDisabled: boolean },
): PublishType {
  let publishType: PublishType = 'publish+send';

  if (emailUnavailable || emailDisabled) {
    publishType = 'publish';
  }

  // "Usually nobody" starts as publish-only but keeps recipients matching visibility,
  // so turning email on is a single click.
  if (
    site.editorDefaultEmailRecipients === 'filter' &&
    normalizeRecipientFilter(site.editorDefaultEmailRecipientsFilter) === null
  ) {
    publishType = 'publish';
  }

  if (post.status === 'sent') {
    publishType = 'send';
  }

  return publishType;
}

/** Splits the host's message so the upgrade phrase can be rendered as a link without HTML injection. */
export function splitUpgradeMessage(message: string): LimitMessagePart[] {
  const match = UPGRADE_PHRASE.exec(message);

  if (!match) {
    return [{ text: message, kind: 'text' }];
  }

  const parts: LimitMessagePart[] = [];
  const before = message.slice(0, match.index);
  const after = message.slice(match.index + match[0].length);

  if (before) {
    parts.push({ text: before, kind: 'text' });
  }
  parts.push({ text: match[0], kind: 'upgrade' });
  if (after) {
    parts.push({ text: after, kind: 'text' });
  }

  return parts;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createPublishOptions({
  post,
  site,
  user,
  limits = {},
  now = () => new Date(),
}: PublishOptionsInputs): PublishOptionsMachine {
  const newsletters = selectableNewsletters(site.newsletters);
  const defaultNewsletter = newsletters[0] ?? null;
  const isDraft = post.status === 'draft';
  const retryingFailedEmail = isDraft && post.email?.status === 'failed';
  const persistedNewsletter = post.newsletter
    ? (site.newsletters.find((option) => option.slug === post.newsletter) ??
      (retryingFailedEmail ? { slug: post.newsletter } : null))
    : null;
  const initialNewsletter =
    persistedNewsletter && (persistedNewsletter.status === 'active' || retryingFailedEmail)
      ? persistedNewsletter
      : defaultNewsletter;
  // Only admins can browse members, so nobody else's count is trusted as a zero.
  const memberCount = user.isAdmin ? site.memberCount : null;

  const emailUnavailableReason = getEmailUnavailableReason(post, site);
  const emailUnavailable = emailUnavailableReason !== null;

  let emailBlock: EmailBlock | null = null;
  let publishBlock: PublishBlock | null = null;
  let newsletter: NewsletterInput | null = initialNewsletter;

  const emailDisabledReason = () =>
    getEmailDisabledReason({ ...site, memberCount }, emailBlock, newsletter !== null);
  const emailDisabled = () => emailDisabledReason() !== null;

  const minScheduledAt = () => zeroMilliseconds(now().getTime() + MIN_SCHEDULE_LEAD_MS);
  const defaultScheduledAt = () => zeroMilliseconds(now().getTime() + DEFAULT_SCHEDULE_LEAD_MS);

  let publishType = getInitialPublishType(post, site, {
    emailUnavailable,
    emailDisabled: emailDisabled(),
  });
  let publishTypeTouched = false;
  let isScheduled = false;
  let scheduledAt = minScheduledAt();
  // A time only counts as a change once it is chosen, so unscheduling cannot leave the state dirty.
  let scheduledAtTouched = false;
  // `undefined` means "not chosen": the filter follows the post and the site default.
  let selectedRecipientFilter: string | null | undefined;

  const recipientFilter = (): string | null => {
    if (selectedRecipientFilter === undefined) {
      return (
        (post.newsletter && normalizeRecipientFilter(post.emailSegment)) ||
        getDefaultRecipientFilter(post, site) ||
        null
      );
    }
    return selectedRecipientFilter;
  };

  let initial = {
    publishType,
    isScheduled,
    scheduledAt,
    newsletterSlug: newsletter?.slug ?? null,
    recipientFilter: recipientFilter(),
  };

  const fullRecipientFilter = (): string | null => {
    if (!newsletter) {
      return null;
    }
    return getFullRecipientFilter(
      getNewsletterRecipientFilter({ slug: newsletter.slug, visibility: newsletter.visibility }),
      recipientFilter(),
    );
  };

  const willEmail = (): boolean => {
    // No newsletter means no email can be built at all, whatever the type says.
    if (!newsletter || emailDisabled()) {
      return false;
    }

    const hasEmail = Boolean(post.email);
    const emailFailed = post.email?.status === 'failed';

    return (
      (publishType !== 'publish' && Boolean(recipientFilter()) && isDraft && !hasEmail) ||
      (isDraft && hasEmail && emailFailed)
    );
  };

  const publishTypeOptions = (): PublishTypeOption[] => {
    const disabled = emailDisabled();

    return [
      { value: 'publish+send', label: 'Publish and email', display: 'Publish and email', disabled },
      { value: 'publish', label: 'Publish only', display: 'Publish', disabled: false },
      { value: 'send', label: 'Email only', display: 'Email', disabled },
    ];
  };

  const isDirty = (): boolean =>
    publishType !== initial.publishType ||
    isScheduled !== initial.isScheduled ||
    ((isScheduled || scheduledAtTouched) && scheduledAt !== initial.scheduledAt) ||
    (newsletter?.slug ?? null) !== initial.newsletterSlug ||
    recipientFilter() !== initial.recipientFilter;

  const getState = (): PublishOptionsState => {
    const options = publishTypeOptions();
    const emails = willEmail();

    return {
      publishType,
      publishTypeOptions: options,
      availablePublishTypes: emailUnavailable
        ? ['publish']
        : options.filter((o) => !o.disabled).map((o) => o.value),
      isScheduled,
      scheduledAt,
      minScheduledAt: minScheduledAt(),
      newsletter,
      newsletters,
      onlyDefaultNewsletter: newsletters.length === 1,
      recipientFilter: recipientFilter(),
      fullRecipientFilter: fullRecipientFilter(),
      willEmail: emails,
      willEmailImmediately: emails && !isScheduled,
      willPublish: publishType !== 'send',
      willOnlyEmail: publishType === 'send',
      emailUnavailable,
      emailUnavailableReason,
      emailDisabled: emailDisabled(),
      emailDisabledReason: emailDisabledReason(),
      emailBlock,
      publishBlock,
      canPublish: isDraft && (publishType !== 'send' || emails),
      isDirty: isDirty(),
    };
  };

  const setScheduledAt = (date: string | Date): void => {
    const time = date instanceof Date ? date.getTime() : Date.parse(date);

    if (Number.isNaN(time)) {
      return;
    }

    const candidate = zeroMilliseconds(time);
    const floor = minScheduledAt();

    scheduledAt = isBefore(candidate, floor) ? floor : candidate;
    scheduledAtTouched = true;
  };

  const runSendingCheck = async (): Promise<void> => {
    await limits.refreshSettings?.();

    try {
      if (!user.isAuthorOrContributor) {
        await limits.checkSendingLimit?.();
      }

      // Checked after the limit so a site under its email limit still shows a verification hold.
      const hold = limits.getEmailVerification?.();

      if (hold?.required) {
        emailBlock = {
          kind: 'email-verification',
          message: hold.message || EMAIL_VERIFICATION_HOLD_MESSAGE,
        };
      }
    } catch (error) {
      emailBlock = { kind: 'sending-limit', message: errorMessage(error) };
    }
  };

  const runPublishingCheck = async (): Promise<void> => {
    if (!user.isAdmin) {
      return;
    }

    try {
      await limits.checkPublishingLimit?.();
    } catch (error) {
      const message = errorMessage(error);
      publishBlock = { kind: 'host-limit', message, parts: splitUpgradeMessage(message) };
    }
  };

  return {
    getState,

    setPublishType(newValue) {
      publishType = newValue;
      publishTypeTouched = true;
    },

    setIsScheduled(shouldSchedule) {
      isScheduled = shouldSchedule === undefined ? !isScheduled : shouldSchedule;

      if (isScheduled && isBefore(scheduledAt, defaultScheduledAt())) {
        scheduledAt = defaultScheduledAt();
      }
    },

    setScheduledAt,

    resetPastScheduledAt() {
      if (isBefore(scheduledAt, minScheduledAt())) {
        isScheduled = false;
      }
    },

    setNewsletter(newValue) {
      newsletter = newValue;
    },

    setRecipientFilter(filter) {
      selectedRecipientFilter = normalizeRecipientFilter(filter);
    },

    reset() {
      publishType = initial.publishType;
      publishTypeTouched = false;
      isScheduled = initial.isScheduled;
      // The construction-time floor may itself be in the past by now.
      scheduledAt = minScheduledAt();
      scheduledAtTouched = false;
      newsletter = initialNewsletter;
      selectedRecipientFilter = undefined;
    },

    async checkLimits() {
      emailBlock = null;
      publishBlock = null;

      await Promise.all([runSendingCheck(), runPublishingCheck()]);

      // A block that lands after the user picked an email type still demotes that pick.
      if (!publishTypeTouched || emailDisabled()) {
        publishType = getInitialPublishType(post, site, {
          emailUnavailable,
          emailDisabled: emailDisabled(),
        });
        initial = { ...initial, publishType };
      }

      return { emailBlock, publishBlock };
    },

    toDispatch() {
      if (!isDraft) {
        return null;
      }

      const emails = willEmail();

      // Never turn an invalid email-only choice into a public publish.
      if (publishType === 'send' && !emails) {
        return null;
      }

      const options: PublishCommandOptions = {};

      if (emails) {
        options.emailOnly = publishType === 'send';

        // A retry must be validated against the newsletter and segment persisted with the
        // failed email, not mutable picker state or the site's current default.
        if (!retryingFailedEmail) {
          const filter = recipientFilter();

          if (newsletter) {
            options.newsletter = newsletter.slug;
          }
          if (filter) {
            options.emailSegment = filter;
          }
        }
      }

      if (isScheduled) {
        return { kind: 'schedule', options: { ...options, publishedAt: scheduledAt } };
      }

      return { kind: 'publish', options };
    },

    toRevertDispatch() {
      return { kind: 'revert' };
    },
  };
}
