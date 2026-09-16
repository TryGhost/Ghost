export const getEmailStatsRefetchInterval = (submittedAt?: string | null): 5000 | 30000 | false => {
  if (!submittedAt) {
    return false;
  }

  const age = Date.now() - Date.parse(submittedAt);
  if (!Number.isFinite(age)) {
    return false;
  }

  return age < 60 * 60 * 1000 ? 5000 : 30000;
};
