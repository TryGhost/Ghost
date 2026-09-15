export const getEmailStatsRefetchInterval = (submittedAt?: string | null): 5000 | false => {
  if (!submittedAt) {
    return false;
  }

  const age = Date.now() - Date.parse(submittedAt);
  return age >= 0 && age < 60 * 60 * 1000 ? 5000 : false;
};
