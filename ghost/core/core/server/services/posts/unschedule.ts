export const POST_UNSCHEDULED_DATA = {
  status: 'draft',
  published_at: null,
};

export const POST_UNSCHEDULE_METADATA = {
  email_only: false,
};

export const POST_UNSCHEDULE_API_DATA = {
  ...POST_UNSCHEDULED_DATA,
  ...POST_UNSCHEDULE_METADATA,
};
