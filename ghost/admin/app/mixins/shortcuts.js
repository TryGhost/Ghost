/* global key */
import Mixin from '@ember/object/mixin';
import {run} from '@ember/runloop';
import {typeOf} from '@ember/utils';

import * as shortcutsCache from '../utils/shortcuts';

// Configure KeyMaster to respond to all shortcuts,
// even inside of
// input, textarea, and select.
key.filter = function () {
    return true;
};

key.setScope('default');
/**
 * Only routes can implement shortcuts.
 * If you need to trigger actions on the controller,
 * simply call them with `this.get('controller').send('action')`.
 *
 * To implement shortcuts, add this mixin to your `extend()`,
 * and implement a `shortcuts` hash.
 * In this hash, keys are shortcut combinations and values are route action names.
 *  (see [keymaster docs](https://github.com/madrobby/keymaster/blob/master/README.markdown)),
 *
 * ```javascript
 * shortcuts: {
 *     'ctrl+s, command+s': 'save'
 * }
 * ```
 * For more complex actions, shortcuts can instead have their value
 * be an object like {action, options}
 * ```javascript
 * shortcuts: {
 *      'ctrl+k': {action: 'markdownShortcut', options: 'createLink'}
 * }
 * ```
 * You can set the scope of your shortcut by passing a scope property.
 * ```javascript
 * shortcuts : {
 *   'enter': {action : 'confirmModal', scope: 'modal'}
 * }
 * ```
 * If you don't specify a scope, we use a default scope called "default".
 * To have all your shortcut work in all scopes, give it the scope "all".
 * Find out more at the keymaster docs
 */
export default Mixin.create({

    registerShortcuts() {
        let shortcuts = this.shortcuts;

        Object.keys(shortcuts).forEach((shortcut) => {
            let scope = shortcuts[shortcut].scope || 'default';
            let action = shortcuts[shortcut];
            let options;

            if (typeOf(action) !== 'string') {
                options = action.options;
                action = action.action;
            }

            shortcutsCache.register(shortcut);

            key(shortcut, scope, (event) => {
                // stop things like ctrl+s from actually opening a save dialog
                event.preventDefault();
                run(this, function () {
                    this.send(action, options);
                });
            });
        });
    },

    removeShortcuts() {
        let shortcuts = this.shortcuts;

        Object.keys(shortcuts).forEach((shortcut) => {
            let scope = shortcuts[shortcut].scope || 'default';
            shortcutsCache.unregister(shortcut);
            key.unbind(shortcut, scope);
        });
    },

    willDestroy() {
        this._super(...arguments);
        this.removeShortcuts();
    }
});
