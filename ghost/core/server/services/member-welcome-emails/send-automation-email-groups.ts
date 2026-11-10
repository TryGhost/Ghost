type AutomationEmailIdentity = {
  automationActionRevisionId: string;
  automationRunStepId: string;
};

export type PreparedAutomationEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string;
  tags: string[];
  trackOpens?: boolean;
  listUnsubscribe?: string;
};

type RecipientVariables = Record<string, string>;

function makeBatchEntry({
  message,
  email,
  index,
}: {
  message: PreparedAutomationEmail;
  email: AutomationEmailIdentity;
  index: number;
}) {
  const { to, html, text, listUnsubscribe, trackOpens, ...shared } = message;
  // Do not introduce variables into content that already uses provider syntax.
  if ([shared.subject, html, text].some((value) => value.includes('%recipient.'))) {
    return null;
  }

  const variables: RecipientVariables = {};
  let templateHtml = html;
  let templateText = text;
  if (listUnsubscribe) {
    const escapedUrl = listUnsubscribe.replaceAll('&', '&amp;');
    const htmlUrl = templateHtml.includes(escapedUrl) ? escapedUrl : listUnsubscribe;
    if (!templateHtml.includes(htmlUrl) || !templateText.includes(listUnsubscribe)) {
      return null;
    }
    templateHtml = templateHtml.replaceAll(htmlUrl, '%recipient.automation_unsubscribe_html%');
    templateText = templateText.replaceAll(listUnsubscribe, '%recipient.list_unsubscribe%');
    variables.list_unsubscribe = listUnsubscribe;
    variables.automation_unsubscribe_html = htmlUrl;
  }

  const template = {
    ...shared,
    html: templateHtml,
    plaintext: templateText,
    track_opens: trackOpens,
  };
  const key = JSON.stringify([
    email.automationActionRevisionId,
    Boolean(listUnsubscribe),
    template,
  ]);
  return { key, template, to, variables, message, stepId: email.automationRunStepId, index };
}

type BatchEntry = NonNullable<ReturnType<typeof makeBatchEntry>>;
type IndexedMessage = { message: PreparedAutomationEmail; index: number };

type BatchMailer = {
  getBatchSize?: () => number;
  send: (
    message: BatchEntry['template'] & { recipientMessageIdPrefixes: Record<string, string> },
    recipients: Record<string, RecipientVariables>,
    replacements: [],
  ) => Promise<{ recipientMessageIds: Record<string, string> } | null>;
};

export async function sendAutomationEmailGroups<Email extends AutomationEmailIdentity>({
  emails,
  prepare,
  sendSingle,
  bulkMailer,
}: {
  emails: readonly Email[];
  prepare: (email: Email) => Promise<PreparedAutomationEmail>;
  sendSingle: (message: PreparedAutomationEmail) => Promise<unknown>;
  bulkMailer: BatchMailer;
}): Promise<PromiseSettledResult<unknown>[]> {
  const prepared = await Promise.allSettled(emails.map(prepare));
  const results: PromiseSettledResult<unknown>[] = [];
  const groups = new Map<string, Map<string, BatchEntry>>();
  const jobs: Promise<void>[] = [];
  const settle = async (entries: IndexedMessage[], send: () => Promise<unknown[]>) => {
    try {
      const values = await send();
      entries.forEach(({ index }, offset) => {
        results[index] = { status: 'fulfilled', value: values[offset] };
      });
    } catch (reason) {
      for (const { index } of entries) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  const single = (entry: IndexedMessage) =>
    settle([entry], async () => [await sendSingle(entry.message)]);

  for (const [index, item] of prepared.entries()) {
    if (item.status === 'rejected') {
      results[index] = item;
      continue;
    }
    const message = item.value;
    const entry = makeBatchEntry({ message, email: emails[index], index });
    if (!entry) {
      jobs.push(single({ message, index }));
      continue;
    }
    const group = groups.get(entry.key) ?? new Map<string, BatchEntry>();
    if (group.has(entry.to.toLowerCase())) {
      // Mailgun keys recipient variables by address. Keep repeated runs separate.
      jobs.push(single(entry));
      continue;
    }
    group.set(entry.to.toLowerCase(), entry);
    groups.set(entry.key, group);
  }

  const limit = Math.max(1, bulkMailer.getBatchSize?.() ?? 1);
  for (const group of groups.values()) {
    const recipients = [...group.values()];
    for (let offset = 0; offset < recipients.length; offset += limit) {
      const entries = recipients.slice(offset, offset + limit);
      if (entries.length === 1) {
        jobs.push(single(entries[0]));
        continue;
      }
      jobs.push(
        settle(entries, async () => {
          const response = await bulkMailer.send(
            {
              ...entries[0].template,
              recipientMessageIdPrefixes: Object.fromEntries(
                entries.map(({ to, stepId }) => [to, stepId]),
              ),
            },
            Object.fromEntries(entries.map(({ to, variables }) => [to, variables])),
            [],
          );
          return entries.map(({ to }) => response && { id: response.recipientMessageIds[to] });
        }),
      );
    }
  }
  await Promise.all(jobs);
  return results;
}
