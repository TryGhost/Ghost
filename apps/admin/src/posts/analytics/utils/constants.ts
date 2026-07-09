// The includes the post-analytics screen fetches for a post. Shared so any
// consumer wanting the *same* cached post (e.g. the gift-link modal opened from
// the analytics header) hits the identical query key instead of a near-miss.
export const POST_ANALYTICS_INCLUDE = 'email,authors,tags,tiers,count.clicks,count.signups,count.paid_conversions,count.positive_feedback,count.negative_feedback,newsletter';
