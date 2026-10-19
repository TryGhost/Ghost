export function stripEmailAccounting<T extends Record<string, unknown>>(
  email: T,
): Omit<
  T,
  'preflight_email_count' | 'candidate_count' | 'preparation_excluded_count' | 'prepared_at'
> {
  // These columns describe internal preparation/submission state.
  delete email.preflight_email_count;
  delete email.candidate_count;
  delete email.preparation_excluded_count;
  delete email.prepared_at;
  return email;
}
