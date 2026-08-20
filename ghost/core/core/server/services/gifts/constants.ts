export const GIFT_EXPIRY_DAYS = 365;
// How far ahead a delivery may be scheduled. Portal's picker carries its own
// copy (GIFT_MAX_SCHEDULE_DAYS in beta-gift-page.jsx) since Portal ships
// separately — change them together.
export const GIFT_MAX_SCHEDULE_DAYS = 365;
// Site-local hour a scheduled delivery is sent at. Portal never derives
// this: the exact send instant travels in the success URL as
// gift_redeemable_at.
export const GIFT_SEND_HOUR = 9;
export const GIFT_REMINDER_LEAD_DAYS = 7;
export const GIFT_REMINDER_FLOOR_DAYS = 3;
export const GIFT_DELIVERY_STALE_AFTER_MS = 60 * 60 * 1000;
export const GIFT_DELIVERY_EMAIL_TAG = 'gift-delivery';
