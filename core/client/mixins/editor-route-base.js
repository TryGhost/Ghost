import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import styleBody from 'ghost/mixins/style-body';

var EditorRouteBase = Ember.Mixin.create(styleBody, ShortcutsRoute, {
    shortcuts: {
        'ctrl+s, command+s': 'save',
        'ctrl+alt+p': 'publish',
        'ctrl+alt+z': 'toggleZenMode'
    },
    actions: {
        save: function () {
            this.get('controller').send('save');
        },
        publish: function () {
            var controller = this.get('controller');
            controller.send('setSaveType', 'publish');
            controller.send('save');
        },
        toggleZenMode: function () {
            Ember.$('body').toggleClass('zen');
        }
    }
});

export default EditorRouteBase;
