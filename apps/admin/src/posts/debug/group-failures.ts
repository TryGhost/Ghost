import type { EmailRecipientFailure } from '@tryghost/admin-x-framework/api/emails';

export interface FailureGroup {
  key: string;
  code: number;
  enhancedCode: string | null;
  severity: EmailRecipientFailure['severity'];
  /** The most common provider message in the group. */
  message: string;
  failures: EmailRecipientFailure[];
}

function mostCommonMessage(failures: EmailRecipientFailure[]) {
  const counts = new Map<string, number>();
  for (const { message } of failures) {
    counts.set(message, (counts.get(message) ?? 0) + 1);
  }
  let best = failures[0].message;
  for (const [message, count] of counts) {
    if (count > (counts.get(best) ?? 0)) {
      best = message;
    }
  }
  return best;
}

/** Groups recipient failures that share a provider response, largest group first. */
export function groupFailures(failures: EmailRecipientFailure[]): FailureGroup[] {
  const groups = new Map<string, EmailRecipientFailure[]>();
  for (const failure of failures) {
    const key = `${failure.severity}:${failure.code}:${failure.enhanced_code || ''}`;
    groups.set(key, [...(groups.get(key) ?? []), failure]);
  }
  const severityRank = (group: FailureGroup) => (group.severity === 'permanent' ? 0 : 1);
  return [...groups.entries()]
    .map(([key, members]) => ({
      key,
      code: members[0].code,
      enhancedCode: members[0].enhanced_code || null,
      severity: members[0].severity,
      message: mostCommonMessage(members),
      failures: members,
    }))
    .sort(
      (a, b) =>
        b.failures.length - a.failures.length ||
        severityRank(a) - severityRank(b) ||
        a.code - b.code,
    );
}
