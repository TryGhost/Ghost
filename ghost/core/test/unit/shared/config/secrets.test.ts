import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadSecretsFromEnv} from '../../../../core/shared/config/secrets';

describe('Config Secrets', function () {
    let tmpDir: string;

    function writeSecret(name: string, contents: string): string {
        const filePath = path.join(tmpDir, name);
        fs.writeFileSync(filePath, contents);
        return filePath;
    }

    beforeEach(function () {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-secrets-'));
    });

    afterEach(function () {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('resolves a nested key from a file', function () {
        const filePath = writeSecret('db', 'hunter2');

        assert.deepEqual(loadSecretsFromEnv({database__connection__password_FILE: filePath}), {
            database: {connection: {password: 'hunter2'}}
        });
    });

    it('matches the suffix case-insensitively', function () {
        const filePath = writeSecret('db', 'hunter2');

        assert.deepEqual(loadSecretsFromEnv({database__connection__password_file: filePath}), {
            database: {connection: {password: 'hunter2'}}
        });
    });

    it('does not parse values', function () {
        const filePath = writeSecret('db', '01234');

        assert.deepEqual(loadSecretsFromEnv({database__connection__password_FILE: filePath}), {
            database: {connection: {password: '01234'}}
        });
    });

    it('strips a single trailing newline but keeps other whitespace', function () {
        const trailing = writeSecret('trailing', 'hunter2\n');
        const surrounding = writeSecret('surrounding', '  hunter2  ');
        const multiple = writeSecret('multiple', 'hunter2\n\n');

        assert.deepEqual(loadSecretsFromEnv({a__b_FILE: trailing}), {a: {b: 'hunter2'}});
        assert.deepEqual(loadSecretsFromEnv({a__b_FILE: surrounding}), {a: {b: '  hunter2  '}});
        assert.deepEqual(loadSecretsFromEnv({a__b_FILE: multiple}), {a: {b: 'hunter2\n'}});
    });

    it('merges multiple secrets under a shared parent', function () {
        const user = writeSecret('user', 'ghost');
        const pass = writeSecret('pass', 'hunter2');

        assert.deepEqual(loadSecretsFromEnv({
            mail__options__auth__user_FILE: user,
            mail__options__auth__pass_FILE: pass
        }), {
            mail: {options: {auth: {user: 'ghost', pass: 'hunter2'}}}
        });
    });

    it('ignores env vars that are not nested config keys', function () {
        const filePath = writeSecret('ca', 'not-a-secret');

        assert.deepEqual(loadSecretsFromEnv({
            SSL_CERT_FILE: filePath,
            CURL_CA_BUNDLE: filePath,
            _FILE: filePath,
            database____password_FILE: filePath
        }), {});
    });

    it('ignores env vars with an empty value', function () {
        assert.deepEqual(loadSecretsFromEnv({database__connection__password_FILE: ''}), {});
    });

    it('keeps numeric key segments as plain objects', function () {
        const filePath = writeSecret('token', 'abc');
        const store = loadSecretsFromEnv({adapters__0__token_FILE: filePath});

        assert.deepEqual(store, {adapters: {0: {token: 'abc'}}});
        assert.equal(Array.isArray(store.adapters), false);
    });

    it('throws if the value and its file reference are both set', function () {
        const filePath = writeSecret('db', 'hunter2');

        assert.throws(() => loadSecretsFromEnv({
            database__connection__password: 'hunter2',
            database__connection__password_FILE: filePath
        }), /Cannot set both database__connection__password and database__connection__password_FILE/);
    });

    it('allows the same key set twice if both point at the same file', function () {
        const filePath = writeSecret('db', 'hunter2');

        assert.deepEqual(loadSecretsFromEnv({
            database__connection__password_FILE: filePath,
            database__connection__password_file: filePath
        }), {
            database: {connection: {password: 'hunter2'}}
        });
    });

    it('throws if the same key is set twice pointing at different files', function () {
        assert.throws(() => loadSecretsFromEnv({
            database__connection__password_FILE: writeSecret('one', 'hunter2'),
            database__connection__password_file: writeSecret('two', 'hunter3')
        }), /to different files/);
    });

    it('throws if the file cannot be read', function () {
        const filePath = path.join(tmpDir, 'nope');

        assert.throws(() => loadSecretsFromEnv({database__connection__password_FILE: filePath}), (err: Error) => {
            assert.match(err.message, /Could not read the secret file referenced by database__connection__password_FILE/);
            assert.equal((err.cause as NodeJS.ErrnoException).code, 'ENOENT');
            return true;
        });
    });

    it('supports a custom separator', function () {
        const filePath = writeSecret('db', 'hunter2');

        assert.deepEqual(loadSecretsFromEnv({'database.connection.password_FILE': filePath}, '.'), {
            database: {connection: {password: 'hunter2'}}
        });
    });
});
