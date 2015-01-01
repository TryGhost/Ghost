var Feature;

Feature = Ember.Object.extend({
    init: function () {
        var self = this;
        this.store.find('setting').then(function (settings) {
            self.set('setting', settings.get('firstObject'));
        });
    },
    labs: Ember.computed('setting', 'setting.labs', function () {
        if (this.setting) {
            return JSON.parse(this.get('setting.labs') || {});
        }
        return {};
    }),
    tagsUI: Ember.computed('config.tagsUI', 'labs.tagsUI', function () {
        return this.config.tagsUI || this.get('labs.tagsUI');
    }),
    codeInjectionUI: Ember.computed('config.codeInjectionUI', 'labs.codeInjectionUI', function () {
        return this.config.codeInjectionUI || this.get('labs.codeInjectionUI');
    })
});

export default Feature;
