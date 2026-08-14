import assert from 'node:assert/strict';
import {loadAndMountEditMode} from '../src/edit-mode/loader.js';

const CONFIG = {scriptUrl: 'https://cdn.example.com/admin-toolbar/admin-toolbar.min.js'};

// NOTE: loader.js keeps module-level state (module memo + mounted handle) —
// this file exercises the whole lifecycle in ordered steps so each step
// leaves the state the next one expects.
describe('edit-mode loader', function () {
    it('mount → exit → remount creates a fresh session and forwards onExit', async function () {
        const mounts = [];
        const fakeModule = {
            mount({config, user, onExit}) {
                const mounted = {config, user, onExit, unmounted: false};
                mounts.push(mounted);
                return {
                    unmount() {
                        mounted.unmounted = true;
                    }
                };
            }
        };
        const importModule = async (url) => {
            assert.equal(url, 'https://cdn.example.com/admin-toolbar/admin-toolbar-editor.min.js');
            return fakeModule;
        };

        const exits = [];
        const handle1 = await loadAndMountEditMode({
            config: CONFIG,
            user: {name: 'Ada'},
            onExit: info => exits.push(info),
            importModule
        });

        // idempotent while mounted — no second session
        const again = await loadAndMountEditMode({config: CONFIG, user: {name: 'Ada'}, importModule});
        assert.equal(again, handle1);
        assert.equal(mounts.length, 1);

        // the session exits itself (Exit button): the loader clears its
        // handle AND forwards the info to the caller's onExit
        mounts[0].onExit({reason: 'boot_failure', message: 'nope'});
        assert.equal(exits.length, 1);
        assert.deepEqual(exits[0], {reason: 'boot_failure', message: 'nope'});

        // re-entry after exit mounts a FRESH session
        const handle2 = await loadAndMountEditMode({config: CONFIG, user: {name: 'Ada'}, importModule});
        assert.notEqual(handle2, handle1);
        assert.equal(mounts.length, 2, 'a fresh session is created after exit');

        // unmount from the shell also clears the handle for re-entry
        handle2.unmount();
        assert.equal(mounts[1].unmounted, true);

        const handle3 = await loadAndMountEditMode({config: CONFIG, user: {name: 'Ada'}, importModule});
        assert.notEqual(handle3, handle2);
        assert.equal(mounts.length, 3);

        handle3.unmount();
    });
});
