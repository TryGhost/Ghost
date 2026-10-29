import type { z } from 'zod';

export function buildInvalidAutomationPayloadMessage(
  issues: ReadonlyArray<z.core.$ZodIssue>,
  message: string,
) {
  if (!issues.length) {
    return message;
  }

  const issueSummaries = issues.slice(0, 3).map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'payload';
    return `${path}: ${issue.message}`;
  });

  return `${message} ${issueSummaries.join('; ')}.`;
}
