/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode chat UI, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

/**
 * BYOK key handling for the edit-mode agent (slice 5).
 *
 * The user's LLM API key is entered in the chat panel and kept in
 * localStorage under a clearly-named, provider-namespaced key — it lives ONLY
 * in this browser and is sent ONLY to the provider endpoint (the chat panel
 * states this explicitly next to the input). It is NEVER logged, never sent
 * to Ghost, and never embedded in URLs or error messages.
 *
 * Keys are namespaced per provider so a later Anthropic/other provider gets
 * its own slot — one provider's key must never be sent to another's endpoint.
 *
 * The storage seam accepts any Storage-shaped object ({getItem, setItem,
 * removeItem}); when none is usable (Safari private mode throws on access)
 * the store degrades to in-memory for the page's lifetime.
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
 *   defaults to globalThis.localStorage, falling back to in-memory
 * @param {string} [options.provider] — namespace ('openai' by default)
 * @returns {{getKey(): string|null, setKey(value: string): void, clearKey(): void, getModel(): string|null, setModel(value: string|null): void}}
 */
export function createKeyStore({storage, provider = 'openai'} = {}) {
    let backing = storage;

    if (!backing) {
        try {
            backing = globalThis.localStorage;
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

    return {
        getKey() {
            return read(keyName);
        },
        setKey(value) {
            const rejection = validateApiKeyShape(value);
            if (rejection) {
                throw new Error(rejection);
            }
            backing.setItem(keyName, value.trim());
        },
        clearKey() {
            try {
                backing.removeItem(keyName);
            } catch {
                // clearing a broken storage is best-effort
            }
        },
        getModel() {
            return read(modelName);
        },
        setModel(value) {
            const trimmed = (value ?? '').trim();
            if (!trimmed) {
                try {
                    backing.removeItem(modelName);
                } catch {
                    // best-effort
                }
                return;
            }
            backing.setItem(modelName, trimmed);
        }
    };
}
