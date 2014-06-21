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
 * In this hash, keys are shortcut combinations
 *  (see [keymaster docs](https://github.com/madrobby/keymaster/blob/master/README.markdown)), and values are controller action names.
 * ```javascript
 * shortcuts: {
 *     'ctrl+s, command+s': 'save',
 *     'ctrl+alt+p': 'toggleZenMode'
 * }
 * ```
 */
var ShortcutsRoute = Ember.Mixin.create({
    registerShortcuts: function () {
        var self = this,
            shortcuts = this.get('shortcuts');

        Ember.keys(shortcuts).forEach(function (shortcut) {
            key(shortcut, function (event) {
                //stop things like ctrl+s from actually opening a save dialogue
                event.preventDefault();
                //map the shortcut to its action
                self.send(shortcuts[shortcut], event);
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
