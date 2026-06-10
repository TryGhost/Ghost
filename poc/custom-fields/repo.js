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

/** Type options for the "data type" dropdown in the create UI. */
export const TYPES = [
    {value: 'text', label: 'Text', tier: 1},
    {value: 'number', label: 'Number', tier: 1},
    {value: 'boolean', label: 'True / False', tier: 1},
    {value: 'select', label: 'List', tier: 2}
];

/** Quick-create presets. A preset just pre-fills label + type (all text for now). */
export const PRESETS = [
    {preset: 'first_name', label: 'First name', type: 'text'},
    {preset: 'last_name', label: 'Last name', type: 'text'},
    {preset: 'phone', label: 'Phone', type: 'text'},
    {preset: 'company', label: 'Company', type: 'text'},
    {preset: 'address', label: 'Address', type: 'text'},
    {preset: 'website', label: 'Website', type: 'text'}
];

const clone = value => JSON.parse(JSON.stringify(value));

function read() {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (err) {
            // corrupt payload: fall through and reseed
        }
    }
    const initial = clone(seed);
    delete initial._comment;
    initial.definitions = initial.definitions || [];
    initial.forms = initial.forms || {};
    initial.values = initial.values || {};
    return write(initial);
}

function write(state) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
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

// --- POC helpers -----------------------------------------------------------

/** Wipe localStorage and reseed from the JSON. Handy for resetting a demo. */
export async function resetToSeed() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
    return read();
}
