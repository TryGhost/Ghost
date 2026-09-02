import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SCHEDULE_LEAD_MS,
  EMAIL_VERIFICATION_HOLD_MESSAGE,
  MIN_SCHEDULE_LEAD_MS,
  createPublishOptions,
  getDefaultRecipientFilter,
  getEmailDisabledReason,
  getEmailUnavailableReason,
  getInitialPublishType,
  selectableNewsletters,
  splitUpgradeMessage,
  tiersSegment,
  type NewsletterInput,
  type PublishOptionsInputs,
  type PublishPostInput,
  type PublishSiteInput,
  type PublishUserInput,
} from './publish-options';

const NOW = new Date('2026-09-02T10:00:00.000Z');
const MIN_SCHEDULED_AT = '2026-09-02T10:00:05.000Z';
const DEFAULT_SCHEDULED_AT = '2026-09-02T10:10:00.000Z';
const EVERYONE = 'status:free,status:-free';

const WEEKLY: NewsletterInput = {
  slug: 'weekly',
  name: 'Weekly',
  status: 'active',
  visibility: 'members',
  sortOrder: 0,
};

const PAID_NEWSLETTER: NewsletterInput = {
  slug: 'paid-only',
  name: 'Paid only',
  status: 'active',
  visibility: 'paid',
  sortOrder: 1,
};

function createPost(overrides: Partial<PublishPostInput> = {}): PublishPostInput {
  return {
    status: 'draft',
    isPage: false,
    visibility: 'public',
    tiers: [],
    newsletter: null,
    emailSegment: null,
    email: null,
    ...overrides,
  };
}

function createSite(overrides: Partial<PublishSiteInput> = {}): PublishSiteInput {
  return {
    membersEnabled: true,
    mailgunConfigured: true,
    editorDefaultEmailRecipients: 'visibility',
    editorDefaultEmailRecipientsFilter: null,
    memberCount: 100,
    newsletters: [WEEKLY],
    ...overrides,
  };
}

function createUser(overrides: Partial<PublishUserInput> = {}): PublishUserInput {
  return { isAdmin: true, isAuthorOrContributor: false, ...overrides };
}

function create(overrides: Partial<PublishOptionsInputs> = {}) {
  return createPublishOptions({
    post: createPost(),
    site: createSite(),
    user: createUser(),
    now: () => NOW,
    ...overrides,
  });
}

describe('selectableNewsletters', () => {
  it('keeps active newsletters in sort order', () => {
    const archived = { slug: 'old', status: 'archived', sortOrder: 0 };
    const second = { slug: 'second', status: 'active', sortOrder: 2 };
    const first = { slug: 'first', status: 'active', sortOrder: 1 };

    expect(selectableNewsletters([archived, second, first]).map((n) => n.slug)).toEqual([
      'first',
      'second',
    ]);
  });
});

describe('tiersSegment', () => {
  it.each([
    [[], null],
    [[{ slug: 'gold' }], 'tier:gold'],
    [[{ slug: 'gold' }, { slug: 'silver' }], 'tier:gold,tier:silver'],
  ])('%j → %j', (tiers, expected) => {
    expect(tiersSegment(tiers)).toBe(expected);
  });
});

describe('getEmailUnavailableReason', () => {
  it.each([
    ['post with members and email settings on', {}, {}, null],
    ['page', { isPage: true }, {}, 'page'],
    ['already emailed', { email: { status: 'submitted' } }, {}, 'already-emailed'],
    [
      'failed email still counts as emailed',
      { email: { status: 'failed' } },
      {},
      'already-emailed',
    ],
    [
      'recipients disabled',
      {},
      { editorDefaultEmailRecipients: 'disabled' as const },
      'disabled-in-settings',
    ],
    ['members off', {}, { membersEnabled: false }, 'disabled-in-settings'],
    ['page wins over settings', { isPage: true }, { membersEnabled: false }, 'page'],
  ])('%s', (_name, post, site, expected) => {
    expect(getEmailUnavailableReason(createPost(post), createSite(site))).toBe(expected);
  });
});

describe('getEmailDisabledReason', () => {
  it.each([
    ['configured with members', {}, null, null],
    ['no mailgun', { mailgunConfigured: false }, null, 'no-mailgun'],
    ['no members', { memberCount: 0 }, null, 'no-members'],
    ['unknown member count', { memberCount: null }, null, null],
    ['sending limit', {}, { kind: 'sending-limit' as const, message: 'over' }, 'sending-limit'],
    [
      'verification hold',
      {},
      { kind: 'email-verification' as const, message: 'in review' },
      'email-verification',
    ],
    [
      'mailgun wins over a block',
      { mailgunConfigured: false },
      { kind: 'sending-limit' as const, message: 'over' },
      'no-mailgun',
    ],
  ])('%s', (_name, site, block, expected) => {
    expect(getEmailDisabledReason(createSite(site), block)).toBe(expected);
  });
});

describe('getInitialPublishType', () => {
  it.each([
    ['email available', {}, {}, { emailUnavailable: false, emailDisabled: false }, 'publish+send'],
    ['email unavailable', {}, {}, { emailUnavailable: true, emailDisabled: false }, 'publish'],
    ['email disabled', {}, {}, { emailUnavailable: false, emailDisabled: true }, 'publish'],
    [
      'usually nobody',
      {},
      { editorDefaultEmailRecipients: 'filter' as const, editorDefaultEmailRecipientsFilter: null },
      { emailUnavailable: false, emailDisabled: false },
      'publish',
    ],
    [
      'explicit default filter',
      {},
      {
        editorDefaultEmailRecipients: 'filter' as const,
        editorDefaultEmailRecipientsFilter: 'label:vip',
      },
      { emailUnavailable: false, emailDisabled: false },
      'publish+send',
    ],
    [
      'sent post overrides everything',
      { status: 'sent' as const },
      {},
      { emailUnavailable: true, emailDisabled: true },
      'send',
    ],
  ])('%s', (_name, post, site, availability, expected) => {
    expect(getInitialPublishType(createPost(post), createSite(site), availability)).toBe(expected);
  });
});

describe('publish type availability', () => {
  it.each([
    ['default site', {}, {}, 'publish+send', ['publish+send', 'publish', 'send']],
    ['mailgun missing', {}, { mailgunConfigured: false }, 'publish', ['publish']],
    ['no members', {}, { memberCount: 0 }, 'publish', ['publish']],
    [
      'member count unknown',
      {},
      { memberCount: null },
      'publish+send',
      ['publish+send', 'publish', 'send'],
    ],
    [
      'members disabled',
      {},
      { membersEnabled: false },
      'publish',
      ['publish+send', 'publish', 'send'],
    ],
    [
      'recipients disabled',
      {},
      { editorDefaultEmailRecipients: 'disabled' as const },
      'publish',
      ['publish+send', 'publish', 'send'],
    ],
    ['page', { isPage: true }, {}, 'publish', ['publish+send', 'publish', 'send']],
    [
      'already emailed post',
      { email: { status: 'submitted' } },
      {},
      'publish',
      ['publish+send', 'publish', 'send'],
    ],
    ['sent post', { status: 'sent' as const }, {}, 'send', ['publish+send', 'publish', 'send']],
    [
      'no newsletters',
      {},
      { newsletters: [] },
      'publish+send',
      ['publish+send', 'publish', 'send'],
    ],
  ])('%s', (_name, post, site, publishType, available) => {
    const state = create({ post: createPost(post), site: createSite(site) }).getState();

    expect(state.publishType).toBe(publishType);
    expect(state.availablePublishTypes).toEqual(available);
  });

  it('exposes the option labels the flow renders', () => {
    expect(
      create({ site: createSite({ mailgunConfigured: false }) }).getState().publishTypeOptions,
    ).toEqual([
      {
        value: 'publish+send',
        label: 'Publish and email',
        display: 'Publish and email',
        disabled: true,
      },
      { value: 'publish', label: 'Publish only', display: 'Publish', disabled: false },
      { value: 'send', label: 'Email only', display: 'Email', disabled: true },
    ]);
  });

  it('does not validate the type being set', () => {
    const machine = create({ site: createSite({ memberCount: 0 }) });

    machine.setPublishType('send');

    expect(machine.getState().publishType).toBe('send');
    expect(machine.getState().emailDisabled).toBe(true);
  });

  it('reports the newsletter selection', () => {
    const single = create().getState();
    const many = create({
      site: createSite({ newsletters: [WEEKLY, PAID_NEWSLETTER] }),
    }).getState();

    expect(single.newsletter?.slug).toBe('weekly');
    expect(single.onlyDefaultNewsletter).toBe(true);
    expect(many.newsletter?.slug).toBe('weekly');
    expect(many.onlyDefaultNewsletter).toBe(false);
  });
});

describe('will* matrix', () => {
  it.each([
    ['publish+send draft', {}, 'publish+send' as const, false, true, true, false, true],
    ['publish draft', {}, 'publish' as const, false, false, true, false, false],
    ['send draft', {}, 'send' as const, false, true, false, true, true],
    ['publish+send scheduled', {}, 'publish+send' as const, true, true, true, false, false],
    ['send scheduled', {}, 'send' as const, true, true, false, true, false],
    [
      'published post',
      { status: 'published' as const },
      'publish+send' as const,
      false,
      false,
      true,
      false,
      false,
    ],
    ['sent post', { status: 'sent' as const }, 'send' as const, false, false, false, true, false],
    [
      'draft that already emailed',
      { email: { status: 'submitted' } },
      'publish+send' as const,
      false,
      false,
      true,
      false,
      false,
    ],
    [
      'draft whose email failed',
      { email: { status: 'failed' } },
      'publish' as const,
      false,
      true,
      true,
      false,
      true,
    ],
    [
      'draft whose email failed, scheduled',
      { email: { status: 'failed' } },
      'publish' as const,
      true,
      true,
      true,
      false,
      false,
    ],
  ])(
    '%s',
    (
      _name,
      post,
      publishType,
      scheduled,
      willEmail,
      willPublish,
      willOnlyEmail,
      willEmailImmediately,
    ) => {
      const machine = create({ post: createPost(post) });

      machine.setPublishType(publishType);
      machine.setIsScheduled(scheduled);

      const state = machine.getState();

      expect(state.willEmail).toBe(willEmail);
      expect(state.willPublish).toBe(willPublish);
      expect(state.willOnlyEmail).toBe(willOnlyEmail);
      expect(state.willEmailImmediately).toBe(willEmailImmediately);
    },
  );

  it('does not email without a recipient filter', () => {
    const machine = create();

    machine.setRecipientFilter(null);

    expect(machine.getState().willEmail).toBe(false);
  });

  it('emails a failed-email draft even without a recipient filter', () => {
    const machine = create({ post: createPost({ email: { status: 'failed' } }) });

    machine.setRecipientFilter(null);

    expect(machine.getState().willEmail).toBe(true);
  });
});

describe('scheduling', () => {
  it('starts unscheduled at the earliest allowed time', () => {
    const state = create().getState();

    expect(state.isScheduled).toBe(false);
    expect(state.scheduledAt).toBe(MIN_SCHEDULED_AT);
    expect(state.minScheduledAt).toBe(MIN_SCHEDULED_AT);
    expect(MIN_SCHEDULE_LEAD_MS).toBe(5000);
    expect(DEFAULT_SCHEDULE_LEAD_MS).toBe(600000);
  });

  it('snaps a stale time forward to the default when scheduling is turned on', () => {
    const machine = create();

    machine.setIsScheduled(true);

    expect(machine.getState().scheduledAt).toBe(DEFAULT_SCHEDULED_AT);
  });

  it('keeps a later time when scheduling is turned on', () => {
    const machine = create();

    machine.setScheduledAt('2026-09-03T09:00:00.000Z');
    machine.setIsScheduled(true);

    expect(machine.getState().scheduledAt).toBe('2026-09-03T09:00:00.000Z');
  });

  it('toggles when no value is given', () => {
    const machine = create();

    machine.setIsScheduled();
    expect(machine.getState().isScheduled).toBe(true);

    machine.setIsScheduled();
    expect(machine.getState().isScheduled).toBe(false);
  });

  it.each([
    ['zeroes milliseconds', '2026-09-03T09:00:00.789Z', '2026-09-03T09:00:00.000Z'],
    ['accepts a Date', new Date('2026-09-03T09:00:00.456Z'), '2026-09-03T09:00:00.000Z'],
    ['floors a past time to the minimum', '2026-09-01T09:00:00.000Z', MIN_SCHEDULED_AT],
    ['floors a time inside the lead window', '2026-09-02T10:00:01.000Z', MIN_SCHEDULED_AT],
    ['accepts the minimum itself', MIN_SCHEDULED_AT, MIN_SCHEDULED_AT],
  ])('%s', (_name, input, expected) => {
    const machine = create();

    machine.setScheduledAt(input);

    expect(machine.getState().scheduledAt).toBe(expected);
  });

  it('ignores an unparseable date', () => {
    const machine = create();

    machine.setScheduledAt('not a date');

    expect(machine.getState().scheduledAt).toBe(MIN_SCHEDULED_AT);
  });

  it('unschedules a time that fell into the past, keeping the stale time', () => {
    let now = NOW;
    const machine = create({ now: () => now });

    machine.setScheduledAt('2026-09-02T10:30:00.000Z');
    machine.setIsScheduled(true);

    now = new Date('2026-09-02T11:00:00.000Z');
    machine.resetPastScheduledAt();

    expect(machine.getState().isScheduled).toBe(false);
    expect(machine.getState().scheduledAt).toBe('2026-09-02T10:30:00.000Z');

    machine.setIsScheduled(true);
    expect(machine.getState().scheduledAt).toBe('2026-09-02T11:10:00.000Z');
  });

  it('keeps a future schedule untouched', () => {
    const machine = create();

    machine.setScheduledAt('2026-09-03T09:00:00.000Z');
    machine.setIsScheduled(true);
    machine.resetPastScheduledAt();

    expect(machine.getState().isScheduled).toBe(true);
    expect(machine.getState().scheduledAt).toBe('2026-09-03T09:00:00.000Z');
  });
});

describe('getDefaultRecipientFilter', () => {
  it.each([
    ['visibility, public post', { visibility: 'public' }, {}, EVERYONE],
    ['visibility, members post', { visibility: 'members' }, {}, EVERYONE],
    ['visibility, paid post', { visibility: 'paid' }, {}, 'status:-free'],
    [
      'visibility, tiers post',
      { visibility: 'tiers', tiers: [{ slug: 'gold' }, { slug: 'silver' }] },
      {},
      'tier:gold,tier:silver',
    ],
    ['visibility, tiers post without tiers', { visibility: 'tiers' }, {}, null],
    ['visibility, unknown visibility', { visibility: 'custom' }, {}, 'custom'],
    [
      'disabled',
      { visibility: 'public' },
      { editorDefaultEmailRecipients: 'disabled' as const },
      null,
    ],
    [
      'explicit filter',
      { visibility: 'public' },
      {
        editorDefaultEmailRecipients: 'filter' as const,
        editorDefaultEmailRecipientsFilter: 'label:vip',
      },
      'label:vip',
    ],
    [
      'usually nobody follows visibility',
      { visibility: 'paid' },
      {
        editorDefaultEmailRecipients: 'filter' as const,
        editorDefaultEmailRecipientsFilter: null,
      },
      'status:-free',
    ],
  ])('%s', (_name, post, site, expected) => {
    expect(getDefaultRecipientFilter(createPost(post), createSite(site))).toBe(expected);
  });
});

describe('recipient filter', () => {
  it('prefers the segment the post was saved with', () => {
    const state = create({
      post: createPost({ newsletter: 'weekly', emailSegment: 'label:vip' }),
    }).getState();

    expect(state.recipientFilter).toBe('label:vip');
  });

  it.each([
    ['no newsletter on the post', { newsletter: null, emailSegment: 'label:vip' }],
    ['no segment on the post', { newsletter: 'weekly', emailSegment: null }],
  ])('falls back to the site default with %s', (_name, post) => {
    expect(create({ post: createPost(post) }).getState().recipientFilter).toBe(EVERYONE);
  });

  it('follows an explicit selection, including clearing it', () => {
    const machine = create();

    machine.setRecipientFilter('label:vip');
    expect(machine.getState().recipientFilter).toBe('label:vip');

    machine.setRecipientFilter(null);
    expect(machine.getState().recipientFilter).toBeNull();
  });

  it.each([
    [
      'members newsletter with a filter',
      [WEEKLY],
      EVERYONE,
      'newsletters.slug:weekly+email_disabled:0+(status:free,status:-free)',
    ],
    [
      'paid newsletter with a filter',
      [PAID_NEWSLETTER],
      EVERYONE,
      'newsletters.slug:paid-only+email_disabled:0+status:-free+(status:free,status:-free)',
    ],
    [
      'members newsletter without a filter',
      [WEEKLY],
      null,
      'newsletters.slug:weekly+email_disabled:0',
    ],
  ])('composes the full filter: %s', (_name, newsletters, filter, expected) => {
    const machine = create({ site: createSite({ newsletters }) });

    machine.setRecipientFilter(filter);

    expect(machine.getState().fullRecipientFilter).toBe(expected);
  });

  it('has no full filter without a newsletter', () => {
    expect(
      create({ site: createSite({ newsletters: [] }) }).getState().fullRecipientFilter,
    ).toBeNull();
  });

  it('recomposes when the newsletter changes', () => {
    const machine = create({ site: createSite({ newsletters: [WEEKLY, PAID_NEWSLETTER] }) });

    machine.setNewsletter(PAID_NEWSLETTER);

    expect(machine.getState().newsletter?.slug).toBe('paid-only');
    expect(machine.getState().fullRecipientFilter).toBe(
      'newsletters.slug:paid-only+email_disabled:0+status:-free+(status:free,status:-free)',
    );
  });
});

describe('toDispatch', () => {
  it.each([
    [
      'publish+send',
      'publish+send' as const,
      false,
      {
        kind: 'publish',
        options: { emailOnly: false, newsletter: 'weekly', emailSegment: EVERYONE },
      },
    ],
    [
      'publish+send scheduled',
      'publish+send' as const,
      true,
      {
        kind: 'schedule',
        options: {
          emailOnly: false,
          newsletter: 'weekly',
          emailSegment: EVERYONE,
          publishedAt: DEFAULT_SCHEDULED_AT,
        },
      },
    ],
    ['publish', 'publish' as const, false, { kind: 'publish', options: {} }],
    [
      'publish scheduled',
      'publish' as const,
      true,
      { kind: 'schedule', options: { publishedAt: DEFAULT_SCHEDULED_AT } },
    ],
    [
      'send',
      'send' as const,
      false,
      {
        kind: 'publish',
        options: { emailOnly: true, newsletter: 'weekly', emailSegment: EVERYONE },
      },
    ],
    [
      'send scheduled',
      'send' as const,
      true,
      {
        kind: 'schedule',
        options: {
          emailOnly: true,
          newsletter: 'weekly',
          emailSegment: EVERYONE,
          publishedAt: DEFAULT_SCHEDULED_AT,
        },
      },
    ],
  ])('%s', (_name, publishType, scheduled, expected) => {
    const machine = create();

    machine.setPublishType(publishType);
    machine.setIsScheduled(scheduled);

    expect(machine.toDispatch()).toEqual(expected);
  });

  it('carries the selected segment', () => {
    const machine = create();

    machine.setRecipientFilter('label:vip');

    expect(machine.toDispatch()).toEqual({
      kind: 'publish',
      options: { emailOnly: false, newsletter: 'weekly', emailSegment: 'label:vip' },
    });
  });

  it('sends the newsletter without a segment when the filter is empty', () => {
    const machine = create({ post: createPost({ email: { status: 'failed' } }) });

    machine.setRecipientFilter(null);

    expect(machine.toDispatch()).toEqual({
      kind: 'publish',
      options: { emailOnly: false, newsletter: 'weekly' },
    });
  });

  it('omits email options when the post will not email', () => {
    const machine = create({ post: createPost({ email: { status: 'submitted' } }) });

    machine.setPublishType('publish+send');

    expect(machine.toDispatch()).toEqual({ kind: 'publish', options: {} });
  });

  it.each([
    ['published', 'published' as const],
    ['scheduled', 'scheduled' as const],
    ['sent', 'sent' as const],
  ])('offers no transition for a %s post', (_name, status) => {
    const machine = create({ post: createPost({ status }) });

    expect(machine.getState().canPublish).toBe(false);
    expect(machine.toDispatch()).toBeNull();
  });

  it.each([
    ['draft', 'draft' as const],
    ['published', 'published' as const],
    ['scheduled', 'scheduled' as const],
    ['sent', 'sent' as const],
  ])('reverts a %s post without options', (_name, status) => {
    expect(create({ post: createPost({ status }) }).toRevertDispatch()).toEqual({ kind: 'revert' });
  });
});

describe('splitUpgradeMessage', () => {
  it.each([
    [
      'no phrase',
      'You are over your member limit.',
      [{ text: 'You are over your member limit.', kind: 'text' }],
    ],
    [
      'phrase in the middle',
      'Your plan is full, please upgrade to continue.',
      [
        { text: 'Your plan is full, ', kind: 'text' },
        { text: 'please upgrade', kind: 'upgrade' },
        { text: ' to continue.', kind: 'text' },
      ],
    ],
    [
      'phrase at the start',
      'Please upgrade your plan.',
      [
        { text: 'Please upgrade', kind: 'upgrade' },
        { text: ' your plan.', kind: 'text' },
      ],
    ],
    ['phrase alone', 'please upgrade', [{ text: 'please upgrade', kind: 'upgrade' }]],
    [
      'only the first phrase links',
      'please upgrade or please upgrade',
      [
        { text: 'please upgrade', kind: 'upgrade' },
        { text: ' or please upgrade', kind: 'text' },
      ],
    ],
  ])('%s', (_name, message, expected) => {
    expect(splitUpgradeMessage(message)).toEqual(expected);
  });
});

describe('checkLimits', () => {
  function ports(overrides = {}) {
    return {
      refreshSettings: vi.fn(() => Promise.resolve()),
      checkSendingLimit: vi.fn(() => Promise.resolve()),
      checkPublishingLimit: vi.fn(() => Promise.resolve()),
      getEmailVerification: vi.fn(() => ({ required: false })),
      ...overrides,
    };
  }

  it('reports no blocks when every check passes', async () => {
    const limits = ports();

    await expect(create({ limits }).checkLimits()).resolves.toEqual({
      emailBlock: null,
      publishBlock: null,
    });
  });

  it('refreshes settings before reading the sending limit', async () => {
    const calls: string[] = [];
    const limits = ports({
      refreshSettings: vi.fn(() => {
        calls.push('refresh');
        return Promise.resolve();
      }),
      checkSendingLimit: vi.fn(() => {
        calls.push('sending');
        return Promise.resolve();
      }),
      getEmailVerification: vi.fn(() => {
        calls.push('verification');
        return { required: false };
      }),
    });

    await create({ limits }).checkLimits();

    expect(calls).toEqual(['refresh', 'sending', 'verification']);
  });

  it('rejects when the settings refresh fails', async () => {
    const limits = ports({
      refreshSettings: vi.fn(() => Promise.reject(new Error('offline'))),
    });

    await expect(create({ limits }).checkLimits()).rejects.toThrow('offline');
  });

  it('blocks email on the sending limit and skips the verification read', async () => {
    const limits = ports({
      checkSendingLimit: vi.fn(() =>
        Promise.reject(new Error('Your plan is over its email limit, please upgrade.')),
      ),
    });

    const result = await create({ limits }).checkLimits();

    expect(result.emailBlock).toEqual({
      kind: 'sending-limit',
      message: 'Your plan is over its email limit, please upgrade.',
    });
    expect(limits.getEmailVerification).not.toHaveBeenCalled();
  });

  it.each([
    [
      'host message',
      { required: true, message: 'Sending is paused for review.' },
      'Sending is paused for review.',
    ],
    ['default message', { required: true }, EMAIL_VERIFICATION_HOLD_MESSAGE],
    ['blank host message', { required: true, message: '' }, EMAIL_VERIFICATION_HOLD_MESSAGE],
  ])('holds email on verification with the %s', async (_name, hold, message) => {
    const limits = ports({ getEmailVerification: vi.fn(() => hold) });

    const result = await create({ limits }).checkLimits();

    expect(result.emailBlock).toEqual({ kind: 'email-verification', message });
  });

  it('does not evaluate the sending limit for authors and contributors', async () => {
    const limits = ports({
      checkSendingLimit: vi.fn(() => Promise.reject(new Error('over limit'))),
      getEmailVerification: vi.fn(() => ({ required: true, message: 'in review' })),
    });

    const result = await create({
      limits,
      user: createUser({ isAdmin: false, isAuthorOrContributor: true }),
    }).checkLimits();

    expect(limits.checkSendingLimit).not.toHaveBeenCalled();
    expect(result.emailBlock).toEqual({ kind: 'email-verification', message: 'in review' });
  });

  it('does not evaluate the publishing limit for non-admins', async () => {
    const limits = ports({
      checkPublishingLimit: vi.fn(() => Promise.reject(new Error('over member limit'))),
    });

    const result = await create({ limits, user: createUser({ isAdmin: false }) }).checkLimits();

    expect(limits.checkPublishingLimit).not.toHaveBeenCalled();
    expect(result.publishBlock).toBeNull();
  });

  it('returns the publishing limit as linkable parts', async () => {
    const limits = ports({
      checkPublishingLimit: vi.fn(() =>
        Promise.reject(new Error('You have reached your member limit, please upgrade your plan.')),
      ),
    });

    const machine = create({ limits });
    const result = await machine.checkLimits();

    expect(result.publishBlock).toEqual({
      kind: 'host-limit',
      message: 'You have reached your member limit, please upgrade your plan.',
      parts: [
        { text: 'You have reached your member limit, ', kind: 'text' },
        { text: 'please upgrade', kind: 'upgrade' },
        { text: ' your plan.', kind: 'text' },
      ],
    });
    expect(machine.getState().emailDisabled).toBe(false);
  });

  it('disables the email types and falls back to publish only', async () => {
    const limits = ports({ getEmailVerification: vi.fn(() => ({ required: true })) });
    const machine = create({ limits });

    expect(machine.getState().publishType).toBe('publish+send');

    await machine.checkLimits();

    const state = machine.getState();

    expect(state.emailDisabled).toBe(true);
    expect(state.emailDisabledReason).toBe('email-verification');
    expect(state.availablePublishTypes).toEqual(['publish']);
    expect(state.publishType).toBe('publish');
    expect(state.isDirty).toBe(false);
  });

  it('keeps a type the user already chose', async () => {
    const limits = ports({ getEmailVerification: vi.fn(() => ({ required: true })) });
    const machine = create({ limits });

    machine.setPublishType('send');
    await machine.checkLimits();

    expect(machine.getState().publishType).toBe('send');
  });

  it('keeps send for a sent post', async () => {
    const limits = ports({ getEmailVerification: vi.fn(() => ({ required: true })) });
    const machine = create({ limits, post: createPost({ status: 'sent' }) });

    await machine.checkLimits();

    expect(machine.getState().publishType).toBe('send');
  });

  it('clears blocks from an earlier run', async () => {
    let required = true;
    const limits = ports({ getEmailVerification: vi.fn(() => ({ required })) });
    const machine = create({ limits });

    await machine.checkLimits();
    expect(machine.getState().emailBlock).not.toBeNull();

    required = false;
    await machine.checkLimits();

    expect(machine.getState().emailBlock).toBeNull();
    expect(machine.getState().publishType).toBe('publish+send');
  });
});

describe('dirty tracking and reset', () => {
  it('starts clean', () => {
    expect(create().getState().isDirty).toBe(false);
  });

  it.each([
    ['publish type', (m: ReturnType<typeof create>) => m.setPublishType('send'), true],
    [
      'same publish type',
      (m: ReturnType<typeof create>) => m.setPublishType('publish+send'),
      false,
    ],
    ['scheduling', (m: ReturnType<typeof create>) => m.setIsScheduled(true), true],
    [
      'scheduled time',
      (m: ReturnType<typeof create>) => m.setScheduledAt('2026-09-03T09:00:00.000Z'),
      true,
    ],
    ['recipient filter', (m: ReturnType<typeof create>) => m.setRecipientFilter('label:vip'), true],
    [
      'same recipient filter',
      (m: ReturnType<typeof create>) => m.setRecipientFilter(EVERYONE),
      false,
    ],
    [
      'cleared recipient filter',
      (m: ReturnType<typeof create>) => m.setRecipientFilter(null),
      true,
    ],
  ])('changing the %s → dirty: %s', (_name, change, expected) => {
    const machine = create();

    change(machine);

    expect(machine.getState().isDirty).toBe(expected);
  });

  it('is dirty when the newsletter changes', () => {
    const machine = create({ site: createSite({ newsletters: [WEEKLY, PAID_NEWSLETTER] }) });

    machine.setNewsletter(PAID_NEWSLETTER);

    expect(machine.getState().isDirty).toBe(true);
  });

  it('restores every option', () => {
    const machine = create({ site: createSite({ newsletters: [WEEKLY, PAID_NEWSLETTER] }) });

    machine.setPublishType('send');
    machine.setIsScheduled(true);
    machine.setNewsletter(PAID_NEWSLETTER);
    machine.setRecipientFilter('label:vip');

    machine.reset();

    const state = machine.getState();

    expect(state.publishType).toBe('publish+send');
    expect(state.isScheduled).toBe(false);
    expect(state.scheduledAt).toBe(MIN_SCHEDULED_AT);
    expect(state.newsletter?.slug).toBe('weekly');
    expect(state.recipientFilter).toBe(EVERYONE);
    expect(state.isDirty).toBe(false);
  });
});
