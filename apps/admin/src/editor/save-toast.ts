import moment from 'moment-timezone';
import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';

/** A run of toast copy; strong runs carry the figures the writer reads for. */
export interface ToastText {
  text: string;
  strong?: boolean;
}

export interface SaveToast {
  title: string;
  description?: ToastText[];
  action?: { label: string; href: string };
}

export interface SaveToastInput {
  displayName: 'post' | 'page';
  /** The status the post had when the save was asked for. */
  previousStatus: PostStatus;
  /** The status the server acknowledged. */
  status: PostStatus;
  url?: string | null;
  previewUrl: string;
  publishedAt?: string | null;
  timezone: string;
  emailOnly: boolean;
  /** Who a scheduled newsletter reaches, as count copy; null when none goes out. */
  recipients: string | null;
}

const SUCCESS_MESSAGES: Partial<Record<PostStatus, Partial<Record<PostStatus, string>>>> = {
  published: { published: 'Updated', draft: 'Saved', scheduled: 'Scheduled', sent: 'Sent' },
  draft: { published: 'Published', draft: 'Saved', scheduled: 'Scheduled', sent: 'Sent' },
  scheduled: { scheduled: 'Updated', draft: 'Unscheduled', published: 'Published', sent: 'Sent' },
  sent: { sent: 'Updated' },
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** `(UTC)` at a zero offset, otherwise the offset without padding or zero minutes: `(UTC+5:30)`, `(UTC-8)`. */
export function utcOffsetLabel(iso: string, timezone: string): string {
  const time = moment.tz(iso, timezone);

  if (time.utcOffset() === 0) {
    return '(UTC)';
  }

  return `(UTC${time
    .format('Z')
    .replace(/([+-])0/, '$1')
    .replace(/:00/, '')})`;
}

function scheduledToast({
  displayName,
  previewUrl,
  publishedAt,
  timezone,
  emailOnly,
  recipients,
}: SaveToastInput): SaveToast {
  const description: ToastText[] = [{ text: emailOnly ? 'Will be sent' : 'Will be published' }];

  if (recipients !== null) {
    description.push(
      { text: emailOnly ? ' to ' : ' and delivered to ' },
      { text: recipients, strong: true },
    );
  }

  if (publishedAt) {
    const time = moment.tz(publishedAt, timezone);
    description.push(
      { text: ' on ' },
      { text: time.format('D MMM YYYY'), strong: true },
      { text: ' at ' },
      { text: time.format('HH:mm'), strong: true },
      { text: `\u00a0${utcOffsetLabel(publishedAt, timezone)}` },
    );
  }

  return {
    title: `${capitalize(displayName)} scheduled`,
    description,
    action: previewUrl ? { label: 'Show preview', href: previewUrl } : undefined,
  };
}

/** The toast an explicit save shows once the server has acknowledged it, or null when none applies. */
export function describeSaveToast(input: SaveToastInput): SaveToast | null {
  if (input.status === 'scheduled') {
    return scheduledToast(input);
  }

  const message = SUCCESS_MESSAGES[input.previousStatus]?.[input.status];

  if (!message) {
    return null;
  }

  return {
    title: `${capitalize(input.displayName)} ${message.toLowerCase()}`,
    action:
      input.status === 'published' && input.url
        ? { label: 'View on site', href: input.url }
        : undefined,
  };
}

export function describeRevertToast(displayName: 'post' | 'page'): SaveToast {
  return { title: `${capitalize(displayName)} reverted to a draft.` };
}
