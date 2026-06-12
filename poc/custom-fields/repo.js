/**
 * POC custom-fields repository (THROWAWAY).
 *
 * Single source of truth for the member custom-fields POC. Plain ESM, no
 * dependencies. Every surface (admin settings, member detail, portal signup,
 * portal account) imports this file directly:
 *
 *     import * as customFields from 'poc/custom-fields/repo';
 *
 * Storage is localStorage, seeded once from custom-fields.seed.json. All
 * functions are async (return Promises) so the call sites already match the
 * shape a real backend API would have. When the backend lands, replace the
 * internals of this one file with API calls; the call sites stay untouched.
 * To remove the POC entirely: delete poc/custom-fields/ and the import lines.
 *
 * @typedef {'text'|'number'|'boolean'|'select'} FieldType
 * @typedef {Object} FieldDefinition
 * @property {string} id
 * @property {string} key            machine name, derived from label
 * @property {string} label          display name
 * @property {FieldType} type
 * @property {string|null} preset     preset id, or null for fully custom
 * @property {number} tier            POC build tier (1 or 2)
 * @property {string|null} helpText
 * @property {string[]|null} options  only for type 'select'
 * @property {boolean} multiple       only for 'select': multi vs single
 * @property {boolean} archived
 * @property {string} createdAt
 *
 * @typedef {Object} FormPlacement
 * @property {string} fieldId
 * @property {boolean} required       collection-time only; storage is nullable
 * @property {string|null} placeholder
 * @property {number} order
 */

import seed from './custom-fields.seed.json';

const STORAGE_KEY = 'ghost-poc-custom-fields';

// Bump whenever custom-fields.seed.json changes. On load, a stored payload with
// an older version is discarded and reseeded from the JSON, so dev browsers pick
// up seed changes automatically (this DOES wipe local edits, which is the point
// of a reseed).
const SEED_VERSION = 9;

/** Type options for the "data type" dropdown in the create UI. */
export const TYPES = [
    {value: 'text', label: 'Text', tier: 1},
    {value: 'number', label: 'Number', tier: 1},
    {value: 'boolean', label: 'True / False', tier: 1},
    {value: 'select', label: 'List', tier: 2}
];

// Presets (beehiiv-style quick-create chips) are deferred for the POC: Ghost's
// built-in `name` would clash with name presets. The `preset` property on a
// definition is kept (nullable) only to record provenance. See
// poc/custom-fields/ideas/field-formats.md.

const clone = value => JSON.parse(JSON.stringify(value));

// Tiny same-tab change notifier so any view (admin section, signup list, member
// detail) re-fetches when the data changes elsewhere, no reload needed.
const listeners = new Set();
function notify() {
    listeners.forEach(fn => fn());
}

/** Subscribe to data changes. Returns an unsubscribe function. */
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Cross-document sync: the `storage` event fires in OTHER documents of the same
// origin (e.g. the admin tab vs the Portal preview iframe), letting the live
// preview reflect edits made in admin without a reload.
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            notify();
        }
    });
}

function read() {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed._seedVersion === SEED_VERSION) {
                return parsed;
            }
            // older seed version (or corrupt): fall through and reseed
        } catch (err) {
            // corrupt payload: fall through and reseed
        }
    }
    const initial = clone(seed);
    delete initial._comment;
    initial._seedVersion = SEED_VERSION;
    initial.definitions = initial.definitions || [];
    initial.forms = initial.forms || {};
    initial.landingForms = initial.landingForms || [];
    initial.values = initial.values || {};
    initial.settings = initial.settings || {};
    initial.dismissed = initial.dismissed || {};
    return write(initial);
}

function write(state) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    notify();
    return state;
}

/** Derive a unique snake_case key from a label, avoiding collisions with `existingKeys`. */
export function deriveKey(label, existingKeys = []) {
    const base = String(label || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'field';
    if (!existingKeys.includes(base)) {
        return base;
    }
    let n = 2;
    while (existingKeys.includes(`${base}_${n}`)) {
        n += 1;
    }
    return `${base}_${n}`;
}

// --- Field definitions -----------------------------------------------------

/** @returns {Promise<FieldDefinition[]>} all definitions (including archived). */
export async function listFields() {
    return read().definitions;
}

/** @returns {Promise<FieldDefinition|null>} */
export async function getField(id) {
    return read().definitions.find(d => d.id === id) || null;
}

/**
 * Create a field. `label` and `type` are required; `key`/`id`/defaults are filled in.
 * @returns {Promise<FieldDefinition>}
 */
export async function createField(input) {
    const state = read();
    const key = deriveKey(input.label, state.definitions.map(d => d.key));
    const field = {
        id: `cf_${key}`,
        key,
        label: input.label,
        type: input.type || 'text',
        preset: input.preset || null,
        tier: input.tier || (input.type === 'select' ? 2 : 1),
        helpText: input.helpText || null,
        options: input.type === 'select' ? (input.options || []) : null,
        multiple: input.type === 'select' ? Boolean(input.multiple) : false,
        archived: false,
        createdAt: input.createdAt || new Date().toISOString()
    };
    state.definitions.push(field);
    write(state);
    return field;
}

/** @returns {Promise<FieldDefinition|null>} */
export async function updateField(id, patch) {
    const state = read();
    const field = state.definitions.find(d => d.id === id);
    if (!field) {
        return null;
    }
    Object.assign(field, patch);
    write(state);
    return field;
}

/** Remove a field and cascade: drop its placements and stored values. */
export async function deleteField(id) {
    const state = read();
    state.definitions = state.definitions.filter(d => d.id !== id);
    for (const surface of Object.keys(state.forms)) {
        state.forms[surface] = (state.forms[surface] || []).filter(p => p.fieldId !== id);
    }
    for (const memberId of Object.keys(state.values)) {
        delete state.values[memberId][id];
    }
    write(state);
    return true;
}

/**
 * Reorder field definitions to match `orderedIds` (drag-to-reorder). The
 * definition array order is also the order fields appear in the "Add a custom
 * field" picker, so this regroups the picker too. Any id not listed is appended.
 * @returns {Promise<FieldDefinition[]>}
 */
export async function reorderFields(orderedIds) {
    const state = read();
    const byId = new Map(state.definitions.map(d => [d.id, d]));
    const reordered = orderedIds.map(id => byId.get(id)).filter(Boolean);
    for (const def of state.definitions) {
        if (!orderedIds.includes(def.id)) {
            reordered.push(def);
        }
    }
    state.definitions = reordered;
    write(state);
    return state.definitions;
}

// --- Form placements -------------------------------------------------------

/** @returns {Promise<FormPlacement[]>} placements for a surface, ordered. */
export async function getForm(surface) {
    const placements = read().forms[surface] || [];
    return [...placements].sort((a, b) => a.order - b.order);
}

/** Replace the placements for a surface. @returns {Promise<FormPlacement[]>} */
export async function setForm(surface, placements) {
    const state = read();
    state.forms[surface] = placements;
    write(state);
    return placements;
}

// --- Member values ---------------------------------------------------------

/** @returns {Promise<Record<string, unknown>>} fieldId -> value map for a member. */
export async function getValues(memberId) {
    return read().values[memberId] || {};
}

/** Set (or clear, when value is null/undefined) one value for a member. */
export async function setValue(memberId, fieldId, value) {
    const state = read();
    state.values[memberId] = state.values[memberId] || {};
    if (value === null || value === undefined || value === '') {
        delete state.values[memberId][fieldId];
    } else {
        state.values[memberId][fieldId] = value;
    }
    write(state);
    return state.values[memberId];
}

// --- Feature settings (e.g. the Landing form on/off) -----------------------

/** @returns {Promise<unknown>} a feature setting value. */
export async function getSetting(key) {
    return (read().settings || {})[key];
}

/** Set a feature setting value. */
export async function setSetting(key, value) {
    const state = read();
    state.settings = state.settings || {};
    state.settings[key] = value;
    write(state);
    return value;
}

// --- Per-member dismissal (e.g. the Landing form prompt) -------------------

/** @returns {Promise<boolean>} whether a member dismissed a given prompt. */
export async function isDismissed(memberId, key) {
    return Boolean(((read().dismissed || {})[memberId] || {})[key]);
}

/** Mark (or clear) a prompt as dismissed for a member. */
export async function setDismissed(memberId, key, value = true) {
    const state = read();
    state.dismissed = state.dismissed || {};
    state.dismissed[memberId] = state.dismissed[memberId] || {};
    if (value) {
        state.dismissed[memberId][key] = true;
    } else {
        delete state.dismissed[memberId][key];
    }
    write(state);
}

// --- Landing forms (Story 5.5: multiple audience-targeted forms) -----------
//
// Each form: { id, name, description, audience, enabled, order, fields: placement[] }.
// `audience` is a comma-joined NQL-style filter string, the same shape the
// Newsletter recipient picker emits ('status:free,status:-free' = all,
// 'status:-free' = paid, tier ids / 'label:slug' for specific people). A real
// build resolves it server-side; the POC matches a subset client-side (below).

const AUDIENCE_ALL = 'status:free,status:-free';
const AUDIENCE_PAID = 'status:-free';
const AUDIENCE_FREE = 'status:free';

/** @returns {Promise<object[]>} landing forms, ordered (priority order). */
export async function listLandingForms() {
    return [...(read().landingForms || [])].sort((a, b) => a.order - b.order);
}

/** @returns {Promise<object|null>} */
export async function getLandingForm(id) {
    return (read().landingForms || []).find(f => f.id === id) || null;
}

/** Create a landing form. `name` required; defaults fill the rest. @returns {Promise<object>} */
export async function createLandingForm({name, description = '', audience = AUDIENCE_ALL} = {}) {
    const state = read();
    state.landingForms = state.landingForms || [];
    const id = `lf_${deriveKey(name, state.landingForms.map(f => f.id.replace(/^lf_/, '')))}`;
    const form = {id, name: name || 'Landing form', description, audience, enabled: true, order: state.landingForms.length, fields: []};
    state.landingForms.push(form);
    write(state);
    return form;
}

/** Patch a landing form's metadata (name/description/audience/enabled). @returns {Promise<object|null>} */
export async function updateLandingForm(id, patch) {
    const state = read();
    const form = (state.landingForms || []).find(f => f.id === id);
    if (!form) {
        return null;
    }
    Object.assign(form, patch);
    write(state);
    return form;
}

/** Remove a landing form (and its per-member dismissals). @returns {Promise<boolean>} */
export async function deleteLandingForm(id) {
    const state = read();
    state.landingForms = (state.landingForms || []).filter(f => f.id !== id);
    for (const memberId of Object.keys(state.dismissed || {})) {
        delete state.dismissed[memberId][id];
    }
    write(state);
    return true;
}

/** Replace the whole list (used for drag-to-reorder). @returns {Promise<object[]>} */
export async function setLandingForms(forms) {
    const state = read();
    state.landingForms = forms.map((f, index) => ({...f, order: index}));
    write(state);
    return state.landingForms;
}

/** @returns {Promise<FormPlacement[]>} a landing form's fields, ordered. */
export async function getLandingFormFields(id) {
    const form = (read().landingForms || []).find(f => f.id === id);
    return [...((form && form.fields) || [])].sort((a, b) => a.order - b.order);
}

/** Replace a landing form's fields. @returns {Promise<FormPlacement[]>} */
export async function setLandingFormFields(id, placements) {
    const state = read();
    const form = (state.landingForms || []).find(f => f.id === id);
    if (form) {
        form.fields = placements;
        write(state);
    }
    return placements;
}

/** A short human label for an audience filter (for the admin row badge). */
export function audienceSummary(audience) {
    if (!audience || audience === AUDIENCE_ALL) {
        return 'All members';
    }
    if (audience === AUDIENCE_PAID) {
        return 'Paid members';
    }
    if (audience === AUDIENCE_FREE) {
        return 'Free members';
    }
    return 'Specific people';
}

/**
 * Does an audience filter match a member? Pure, shared by the Portal card.
 * Subset of NQL: status:free / status:-free, tier id/slug, label:slug. Tokens
 * are OR'd (like the recipient picker). Labels are inert in the POC, the Portal
 * member object has no labels; a real build matches them server-side.
 * @param {string} audience
 * @param {{paid?: boolean, status?: string, tiers?: {id?: string, slug?: string}[]}} member
 */
export function matchAudience(audience, member = {}) {
    if (!audience) {
        return true;
    }
    const isPaid = Boolean(member.paid) || (member.status && member.status !== 'free');
    const tiers = member.tiers || [];
    return audience.split(',').map(t => t.trim()).filter(Boolean).some((token) => {
        if (token === 'status:free') {
            return !isPaid;
        }
        if (token === 'status:-free') {
            return isPaid;
        }
        if (token.startsWith('label:') || token.startsWith('offer_redemptions:')) {
            return false; // labels/offers aren't on the Portal member object (POC limit)
        }
        return tiers.some(tier => tier.id === token || tier.slug === token);
    });
}

// --- POC helpers -----------------------------------------------------------

/** Wipe localStorage and reseed from the JSON. Handy for resetting a demo. */
export async function resetToSeed() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
    return read();
}
