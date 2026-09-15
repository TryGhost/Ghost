export interface ActivitySettings {
  editorDefaultEmailRecipients?: string;
  commentsEnabled?: string;
  emailTrackClicks?: boolean;
}

const EMAIL_EVENTS = [
  'email_sent_event',
  'email_delivered_event',
  'email_opened_event',
  'email_failed_event',
  'email_complaint_event',
];

const EVENT_TYPES = [
  { event: 'signup_event', name: 'Signups', group: 'auth', icon: 'event-signed-up' },
  { event: 'login_event', name: 'Logins', group: 'auth', icon: 'event-logged-in' },
  {
    event: 'subscription_event',
    name: 'Paid subscriptions',
    group: 'payments',
    icon: 'event-subscriptions',
  },
  { event: 'payment_event', name: 'Payments', group: 'payments', icon: 'event-subscriptions' },
  {
    event: 'newsletter_event',
    name: 'Email subscriptions',
    group: 'emails',
    icon: 'event-subscribed-to-email',
  },
  {
    event: 'email_opened_event',
    name: 'Email opened',
    group: 'emails',
    icon: 'event-opened-email',
  },
  {
    event: 'email_delivered_event',
    name: 'Email received',
    group: 'emails',
    icon: 'event-received-email',
  },
  {
    event: 'email_complaint_event',
    name: 'Email flagged as spam',
    group: 'emails',
    icon: 'event-email-delivery-spam',
  },
  {
    event: 'email_failed_event',
    name: 'Email bounced',
    group: 'emails',
    icon: 'event-email-delivery-failed',
  },
  {
    event: 'email_change_event',
    name: 'Email address changed',
    group: 'emails',
    icon: 'event-email-changed',
  },
  {
    event: 'automated_email_sent_event',
    name: 'Welcome email received',
    group: 'emails',
    icon: 'event-sent-email',
  },
  { event: 'feedback_event', name: 'Feedback', group: 'others', icon: 'event-more-like-this' },
];

export function excludedActivityEvents(value: string | null): string[] {
  // Query parameters are user input. Allow future event names, but never let
  // an exclusion become an NQL expression of its own.
  return [...new Set((value ?? '').split(',').filter((event) => /^[a-z_]+$/.test(event)))];
}

function hiddenActivityEvents(settings: ActivitySettings, memberId?: string): string[] {
  const hidden = ['aggregated_click_event'];
  if (!memberId || settings.editorDefaultEmailRecipients === 'disabled') {
    hidden.push(...EMAIL_EVENTS);
  }
  if (settings.editorDefaultEmailRecipients === 'disabled') {
    hidden.push('newsletter_event');
  }
  return hidden;
}

export function availableActivityTypes(settings: ActivitySettings, memberId?: string) {
  const types = [...EVENT_TYPES];
  if (settings.commentsEnabled !== 'off') {
    types.push({
      event: 'comment_event',
      name: 'Comments',
      group: 'others',
      icon: 'event-comment',
    });
  }
  if (settings.emailTrackClicks) {
    types.push({
      event: 'click_event',
      name: 'Clicked link in email',
      group: 'others',
      icon: 'event-click',
    });
  }
  const hidden = new Set(hiddenActivityEvents(settings, memberId));
  return types.filter(({ event }) => !hidden.has(event));
}

export function toggleActivityType(event: string, excluded: string | null): string {
  const events = new Set(excludedActivityEvents(excluded));
  const group =
    event === 'subscription_event'
      ? [event, 'gift_redemption_event', 'gift_ended_event']
      : event === 'payment_event'
        ? [event, 'donation_event', 'gift_purchase_event']
        : [event];
  const wasExcluded = events.has(event);
  for (const item of group) {
    if (wasExcluded) {
      events.delete(item);
    } else {
      events.add(item);
    }
  }
  return [...events].join(',');
}

export function activityQueryOptions({
  settings,
  memberId,
  excluded,
}: {
  settings: ActivitySettings;
  memberId?: string;
  excluded: string | null;
}) {
  const events = new Set([
    ...excludedActivityEvents(excluded),
    ...hiddenActivityEvents(settings, memberId),
  ]);
  // Core selects this source as "complained" but emits "complaint" rows.
  // Keep the existing URL spelling while excluding both backend spellings.
  if (events.has('email_complaint_event')) {
    events.add('email_complained_event');
  }
  if (settings.commentsEnabled === 'off') {
    events.add('comment_event');
  }
  return { memberId, excludedEvents: [...events] };
}
