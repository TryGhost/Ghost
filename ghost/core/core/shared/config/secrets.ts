import fs from 'node:fs';
import {setWith} from 'lodash';

const SUFFIX = '_file';

type SecretStore = Record<string, unknown>;

/**
 * Whether an env var name is a reference to a secret file rather than a config value itself.
 */
function isSecretFileRef(name: string, separator: string = '__'): boolean {
    if (!name.toLowerCase().endsWith(SUFFIX)) {
        return false;
    }

    const keyPath = name.slice(0, -SUFFIX.length).split(separator);

    // the key must be nested, which keeps unrelated env vars such as SSL_CERT_FILE out
    return keyPath.length >= 2 && keyPath.every(segment => !!segment);
}

/**
 * Resolve `<config_key>_FILE` env vars into config values by reading the file they point at,
 * so secrets can be mounted (Docker/Swarm secrets, k8s projected volumes, systemd LoadCredential)
 * instead of being passed as plaintext env vars.
 *
 *   database__connection__password_FILE=/run/secrets/db_password
 *
 * The suffix is matched case-insensitively.
 *
 * Returns a plain object suitable for an nconf `literal` store.
 */
function loadSecretsFromEnv(env: NodeJS.ProcessEnv = process.env, separator: string = '__'): SecretStore {
    const store: SecretStore = {};
    const seen = new Map<string, {name: string, filePath: string}>();

    for (const [name, filePath] of Object.entries(env)) {
        if (!isSecretFileRef(name, separator) || !filePath) {
            continue;
        }

        const varName = name.slice(0, -SUFFIX.length);

        if (env[varName] !== undefined) {
            // new Error is allowed here, as we do not want config to depend on @tryghost/error
            // eslint-disable-next-line ghost/ghost-custom/no-native-error
            throw new Error(`Cannot set both ${varName} and ${name} - use one or the other.`);
        }

        const duplicate = seen.get(varName);

        if (duplicate) {
            // env var names are case-sensitive on POSIX, so the same key can be set twice —
            // only a conflict if they disagree about which file to read
            if (duplicate.filePath !== filePath) {
                // eslint-disable-next-line ghost/ghost-custom/no-native-error
                throw new Error(`Cannot set both ${duplicate.name} and ${name} to different files - they resolve to the same config key.`);
            }

            continue;
        }

        seen.set(varName, {name, filePath});

        let contents: string;

        try {
            contents = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            // eslint-disable-next-line ghost/ghost-custom/no-native-error
            throw new Error(`Could not read the secret file referenced by ${name}: ${filePath}`, {cause: err});
        }

        // strip a single trailing newline, matching `$(cat file)` behaviour, but leave
        // any other surrounding whitespace alone in case it is part of the secret
        // setWith with Object keeps numeric key segments as plain objects rather than arrays
        setWith(store, varName.split(separator), contents.replace(/\r?\n$/, ''), Object);
    }

    return store;
}

export {loadSecretsFromEnv, isSecretFileRef};
