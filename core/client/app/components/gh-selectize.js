import Ember from 'ember';
import EmberSelectizeComponent from 'ember-cli-selectize/components/ember-selectize';

export default EmberSelectizeComponent.extend({

    selectizeOptions: Ember.computed(function () {
        const options = this._super(...arguments);

        options.onChange = Ember.run.bind(this, '_onChange');

        return options;
    }),

    _dontOpenWhenBlank: Ember.on('didInsertElement', function () {
        var openOnFocus = this.get('openOnFocus');

        if (!openOnFocus) {
            Ember.run.next(this, function () {
                var selectize = this._selectize;
                if (selectize) {
                    selectize.on('dropdown_open', function () {
                        if (Ember.isBlank(selectize.$control_input.val())) {
                            selectize.close();
                        }
                    });
                    selectize.on('type', function (filter) {
                        if (Ember.isBlank(filter)) {
                            selectize.close();
                        }
                    });
                }
            });
        }
    }),

    /**
    * Event callback that is triggered when user creates a tag
    * - modified to pass the caret position to the action
    */
    _create: function (input, callback) {
        var caret = this._selectize.caretPos;

        // Delete user entered text
        this._selectize.setTextboxValue('');
        // Send create action

        // allow the observers and computed properties to run first
        Ember.run.schedule('actions', this, function () {
            this.sendAction('create-item', input, caret);
        });
        // We cancel the creation here, so it's up to you to include the created element
        // in the content and selection property
        callback(null);
    },

    _addSelection: function (obj) {
        var _valuePath = this.get('_valuePath'),
            val = Ember.get(obj, _valuePath),
            caret = this._selectize.caretPos;

        // caret position is always 1 more than the desired index as this method
        // is called after selectize has inserted the item and the caret has moved
        // to the right
        caret = caret - 1;

        this.get('selection').insertAt(caret, obj);

        Ember.run.schedule('actions', this, function () {
            this.sendAction('add-item', obj);
            this.sendAction('add-value', val);
        });
    },

    _onChange: function (args) {
        const selection = Ember.get(this, 'selection'),
              valuePath = Ember.get(this, '_valuePath');

        if (!args || !selection || !Ember.isArray(selection) || args.length !== selection.length) {
            return;
        }

        let hasNoChanges = selection.every(function (obj, idx) {
            return Ember.get(obj, valuePath) === args[idx];
        });

        if (hasNoChanges) {
            return;
        }

        let reorderedSelection = Ember.A([]);

        args.forEach(function (value) {
            const obj = selection.find(function (item) {
                return (Ember.get(item, valuePath) + '') === value;
            });

            if (obj) {
                reorderedSelection.addObject(obj);
            }
        });

        this.set('selection', reorderedSelection);
    }

});
