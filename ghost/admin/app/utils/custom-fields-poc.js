// POC custom-fields accessor for the Ember admin (THROWAWAY).
//
// The shared source of truth is poc/custom-fields/repo.js, but the classic
// Ember build can't relative-import a file outside its app tree, so this is a
// minimal accessor that talks to the SAME localStorage key and JSON shape.
// Values written here are read by the React side and vice-versa.
//
// Migration path (Option B): publish poc/custom-fields as a workspace package
// and replace this file's body with `export * from '@tryghost/custom-fields-poc'`.

const STORAGE_KEY = 'ghost-poc-custom-fields';

const listeners = new Set();

export function isEmptyValue(value) {
    return value === null || value === undefined || value === '';
}

function notify() {
    listeners.forEach(fn => fn());
}

function read() {
    try {
        const raw = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (err) {
        // corrupt or unavailable storage: fall through to an empty shape
    }
    return {definitions: [], forms: {}, values: {}};
}

function write(state) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    notify();
}

export function listFields() {
    return read().definitions || [];
}

export function getValues(memberId) {
    return (read().values || {})[memberId] || {};
}

export function setValue(memberId, fieldId, value) {
    const state = read();
    state.values = state.values || {};
    state.values[memberId] = state.values[memberId] || {};
    if (isEmptyValue(value)) {
        delete state.values[memberId][fieldId];
    } else {
        state.values[memberId][fieldId] = value;
    }
    write(state);
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            notify();
        }
    });
}
