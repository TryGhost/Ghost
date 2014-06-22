/* global key, console */

//Configure KeyMaster to respond to all shortcuts,
//even inside of
//input, textarea, and select.
key.filter = function () {
    return true;
};

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
 *     'ctrl+s, command+s': 'save',
 *     'ctrl+alt+z': 'toggleZenMode'
 * }
 * ```
 * For more complex actions, shortcuts can instead have their value
 * be an object like {action, options}
 * ```javascript
 * shortcuts: {
 *      'ctrl+k': {action: 'markdownShortcut', options: 'createLink'}
 * }
 * ```
 */
var ShortcutsRoute = Ember.Mixin.create({
    registerShortcuts: function () {
        var self = this,
            shortcuts = this.get('shortcuts');

        Ember.keys(shortcuts).forEach(function (shortcut) {
            key(shortcut, function (event) {
                var action = shortcuts[shortcut],
                    options;
                if (Ember.typeOf(action) !== 'string') {
                    options = action.options;
                    action = action.action;
                }
                
                //stop things like ctrl+s from actually opening a save dialogue
                event.preventDefault();
                self.send(action, options);
            });
        });
    },
    removeShortcuts: function () {
        var shortcuts = this.get('shortcuts');

        Ember.keys(shortcuts).forEach(function (shortcut) {
            key.unbind(shortcut);
        });
    },
    activate: function () {
        this._super();
        if (!this.shortcuts) {
            console.error('Shortcuts not found on route');
            return;
        }
        this.registerShortcuts();
    },
    deactivate: function () {
        this._super();
        this.removeShortcuts();
    }
});

export default ShortcutsRoute;
