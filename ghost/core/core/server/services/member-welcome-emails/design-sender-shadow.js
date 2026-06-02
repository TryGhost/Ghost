/**
 * SPIKE-ONLY in-memory shadow for the design-tier email sender (NY-1308).
 *
 * REAL HOME (future, NOT in this spike — NY-1260): three nullable columns on
 * `email_design_settings`: sender_name, sender_email, sender_reply_to.
 * SEED SOURCE (future backfill): welcome_email_automated_emails.sender_*
 * (force-synced today, so unambiguous; null -> null). Until that migration
 * lands we keep the value here, keyed by email_design_setting_id.
 *
 * Ephemeral on purpose: re-seeded on dev boot. A null seed means the cascade
 * falls through to the newsletter/site fallback (today's behaviour "A").
 *
 * Guarded to NODE_ENV === 'development'. Outside development every read returns
 * null and every write is a no-op, so the production welcome-email send path is
 * unaffected. Delete this module with the rest of the spike.
 */

const SENDER_FIELDS = ['sender_name', 'sender_email', 'sender_reply_to'];

/** @type {Map<string, {sender_name: string|null, sender_email: string|null, sender_reply_to: string|null}>} */
const records = new Map();

function isEnabled() {
    return process.env.NODE_ENV === 'development';
}

/**
 * @param {string} emailDesignSettingId
 * @returns {{sender_name: string|null, sender_email: string|null, sender_reply_to: string|null} | null}
 */
function get(emailDesignSettingId) {
    if (!isEnabled() || !emailDesignSettingId) {
        return null;
    }
    return records.get(emailDesignSettingId) || null;
}

/**
 * Merge the provided sender fields onto the shadow record. Only keys present in
 * `attrs` are overwritten, so callers can update one field at a time.
 * @param {string} emailDesignSettingId
 * @param {{sender_name?: string|null, sender_email?: string|null, sender_reply_to?: string|null}} attrs
 */
function set(emailDesignSettingId, attrs = {}) {
    if (!isEnabled() || !emailDesignSettingId) {
        return;
    }
    const current = records.get(emailDesignSettingId) || {sender_name: null, sender_email: null, sender_reply_to: null};
    const next = {...current};
    for (const field of SENDER_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(attrs, field)) {
            next[field] = attrs[field];
        }
    }
    records.set(emailDesignSettingId, next);
}

/**
 * Seed the shadow once per design id. No-op if a record already exists, so
 * reloads (loadMemberWelcomeEmails runs on every member event) never clobber
 * edits made during the dev session.
 * @param {string} emailDesignSettingId
 * @param {{sender_name?: string|null, sender_email?: string|null, sender_reply_to?: string|null}} attrs
 */
function seedFrom(emailDesignSettingId, attrs = {}) {
    if (!isEnabled() || !emailDesignSettingId || records.has(emailDesignSettingId)) {
        return;
    }
    set(emailDesignSettingId, attrs);
}

module.exports = {
    isEnabled,
    get,
    set,
    seedFrom
};
