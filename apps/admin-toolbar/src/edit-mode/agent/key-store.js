/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode chat UI, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

/**
 * BYOK key handling for the edit-mode agent (slice 5).
 *
 * The user's LLM API key is entered in the chat panel and kept in
 * sessionStorage under a clearly-named, provider-namespaced key. It is sent
 * ONLY to the provider endpoint — NEVER logged, never sent to Ghost, never
 * embedded in URLs or error messages.
 *
 * RESIDUAL RISK (deliberate, disclosed in the chat panel): sessionStorage
 * lives on the SITE'S origin, so any script running on the site — theme code,
 * an injected third-party tag, code-injection settings — can read the key
 * while it is stored. sessionStorage is chosen over localStorage to bound
 * that exposure in time: the key does not persist — it is scoped to the tab
 * and cleared when the tab closes — but it is NOT origin-isolated from the
 * site's own scripts. Users are told exactly this next to the input.
 *
 * Keys are namespaced per provider so a later Anthropic/other provider gets
 * its own slot — one provider's key must never be sent to another's endpoint.
 *
 * The storage seam accepts any Storage-shaped object ({getItem, setItem,
 * removeItem}); when none is usable the store degrades to in-memory for the
 * page's lifetime. Safari's private mode has thrown on ACCESS in the past and
 * throws on WRITE today (the storage object exists with a zero quota), so
 * both paths degrade: an unusable storage at construction AND a throwing
 * setItem at write time fall back to the in-memory store.
 */

export const AGENT_KEY_STORAGE_PREFIX = 'ghost-edit-mode-agent-api-key';
export const AGENT_MODEL_STORAGE_PREFIX = 'ghost-edit-mode-agent-model';

/**
 * Loose shape validation — deliberately provider-agnostic (no sk- prefix
 * check): non-empty, no whitespace, and long enough to plausibly be a key.
 *
 * @returns {string|null} a user-readable rejection, or null when acceptable
 */
export function validateApiKeyShape(value) {
    const trimmed = (value ?? '').trim();

    if (!trimmed) {
        return 'API key cannot be empty.';
    }
    if (/\s/.test(trimmed)) {
        return 'API key cannot contain spaces — check for a partial paste.';
    }
    if (trimmed.length < 16) {
        return 'That does not look like an API key (too short).';
    }

    return null;
}

function memoryStorage() {
    const map = new Map();
    return {
        getItem: key => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key)
    };
}

/**
 * @param {Object} [options]
 * @param {Storage|Object|null} [options.storage] — Storage-shaped seam;
 *   defaults to globalThis.sessionStorage, falling back to in-memory
 * @param {string} [options.provider] — namespace ('openai' by default)
 * @returns {{getKey(): string|null, setKey(value: string): void, clearKey(): void, getModel(): string|null, setModel(value: string|null): void}}
 */
export function createKeyStore({storage, provider = 'openai'} = {}) {
    let backing = storage;

    if (!backing) {
        try {
            backing = globalThis.sessionStorage;
        } catch {
            backing = null;
        }
    }
    if (!backing) {
        backing = memoryStorage();
    }

    const keyName = `${AGENT_KEY_STORAGE_PREFIX}:${provider}`;
    const modelName = `${AGENT_MODEL_STORAGE_PREFIX}:${provider}`;

    const read = (name) => {
        try {
            return backing.getItem(name) || null;
        } catch {
            return null;
        }
    };

    // Safari private mode throws on WRITE while the storage object exists —
    // degrade the whole store to in-memory so the value stays usable for the
    // page's lifetime (values written before the switch are gone, which
    // matches what a throwing storage would have kept anyway).
    const write = (name, value) => {
        try {
            backing.setItem(name, value);
        } catch {
            backing = memoryStorage();
            backing.setItem(name, value);
        }
    };

    const remove = (name) => {
        try {
            backing.removeItem(name);
        } catch {
            // clearing a broken storage is best-effort
        }
    };

    return {
        getKey() {
            return read(keyName);
        },
        setKey(value) {
            const rejection = validateApiKeyShape(value);
            if (rejection) {
                throw new Error(rejection);
            }
            write(keyName, value.trim());
        },
        clearKey() {
            remove(keyName);
        },
        getModel() {
            return read(modelName);
        },
        setModel(value) {
            const trimmed = (value ?? '').trim();
            if (!trimmed) {
                remove(modelName);
                return;
            }
            write(modelName, trimmed);
        }
    };
}
