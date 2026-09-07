module.exports = (email) => {
  // These columns describe internal preparation/submission state.
  delete email.preflight_email_count;
  delete email.candidate_count;
  delete email.preparation_excluded_count;
  delete email.prepared_at;
  return email;
};
