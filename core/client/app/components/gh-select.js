import Ember from 'ember';
// GhostSelect is a solution to Ember.Select being evil and worthless.
// (Namely, this solves problems with async data in Ember.Select)
// Inspired by (that is, totally ripped off from) this JSBin
// http://emberjs.jsbin.com/rwjblue/40/edit

// Usage:
// Extend this component and create a template for your component.
// Your component must define the `options` property.
// Optionally use `initialValue` to set the object
//     you want to have selected to start with.
// Both options and initalValue are promise safe.
// Set onChange in your template to be the name
//    of the action you want called in your
// For an example, see gh-roles-selector

var GhostSelect = Ember.Component.extend({
    tagName: 'span',
    classNames: ['gh-select'],
    attributeBindings: ['tabindex'],

    tabindex: '0', // 0 must be a string, or else it's interpreted as false

    options: null,
    initialValue: null,

    resolvedOptions: null,
    resolvedInitialValue: null,

    // Convert promises to their values
    init: function () {
        var self = this;

        this._super.apply(this, arguments);

        Ember.RSVP.hash({
            resolvedOptions: this.get('options'),
            resolvedInitialValue: this.get('initialValue')
        }).then(function (resolvedHash) {
            self.setProperties(resolvedHash);

            // Run after render to ensure the <option>s have rendered
            Ember.run.schedule('afterRender', function () {
                self.setInitialValue();
            });
        });
    },

    setInitialValue: function () {
        var initialValue = this.get('resolvedInitialValue'),
            options = this.get('resolvedOptions'),
            initialValueIndex = options.indexOf(initialValue);

        if (initialValueIndex > -1) {
            this.$('option:eq(' + initialValueIndex + ')').prop('selected', true);
        }
    },

    // Called by DOM events
    change: function () {
        this._changeSelection();
    },

    // Send value to specified action
    _changeSelection: function () {
        var value = this._selectedValue();

        Ember.set(this, 'value', value);
        this.sendAction('onChange', value);
    },

    _selectedValue: function () {
        var selectedIndex = this.$('select')[0].selectedIndex;

        return this.get('options').objectAt(selectedIndex);
    }
});

export default GhostSelect;
