/**
 * All settings views other than the index should inherit from this base class.
 * It ensures that the correct screen is showing when a mobile user navigates
 * to a `settings.someRouteThatIsntIndex` route.
 */

var SettingsContentBaseView = Ember.View.extend({
    tagName: 'section',
    classNames: ['settings-content', 'fade-in'],
    showContent: function () {
        this.get('parentView').showSettingsContent();
    }.on('didInsertElement')
});

export default SettingsContentBaseView;
