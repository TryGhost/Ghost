/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import EmberSelectizeComponent from 'ember-cli-selectize/components/ember-selectize';

const {computed, isBlank, get, on, run} = Ember;
const emberA = Ember.A;

export default EmberSelectizeComponent.extend({

    selectizeOptions: computed(function () {
        let options = this._super(...arguments);

        options.onChange = run.bind(this, '_onChange');

        return options;
    }),

    _dontOpenWhenBlank: on('didInsertElement', function () {
        let openOnFocus = this.get('openOnFocus');

        if (!openOnFocus) {
            run.schedule('afterRender', this, function () {
                let selectize = this._selectize;
                if (selectize) {
                    selectize.on('dropdown_open', function () {
                        if (isBlank(selectize.$control_input.val())) {
                            selectize.close();
                        }
                    });
                    selectize.on('type', function (filter) {
                        if (isBlank(filter)) {
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
    _create(input, callback) {
        let caret = this._selectize.caretPos;

        // Delete user entered text
        this._selectize.setTextboxValue('');
        // Send create action

        // allow the observers and computed properties to run first
        run.schedule('actions', this, function () {
            this.sendAction('create-item', input, caret);
        });
        // We cancel the creation here, so it's up to you to include the created element
        // in the content and selection property
        callback(null);
    },

    _addSelection(obj) {
        let _valuePath = this.get('_valuePath');
        let val = get(obj, _valuePath);
        let caret = this._selectize.caretPos;

        // caret position is always 1 more than the desired index as this method
        // is called after selectize has inserted the item and the caret has moved
        // to the right
        caret = caret - 1;

        this.get('selection').insertAt(caret, obj);

        run.schedule('actions', this, function () {
            this.sendAction('add-item', obj);
            this.sendAction('add-value', val);
        });
    },

    _onChange(args) {
        let selection = Ember.get(this, 'selection');
        let valuePath = Ember.get(this, '_valuePath');

        if (!args || !selection || !Ember.isArray(selection) || args.length !== selection.length) {
            return;
        }

        let hasNoChanges = selection.every(function (obj, idx) {
            return Ember.get(obj, valuePath) === args[idx];
        });

        if (hasNoChanges) {
            return;
        }

        let reorderedSelection = emberA([]);

        args.forEach((value) => {
            let obj = selection.find(function (item) {
                // jscs:disable
                return (get(item, valuePath) + '') === value;
                // jscs:enable
            });

            if (obj) {
                reorderedSelection.addObject(obj);
            }
        });

        this.set('selection', reorderedSelection);
    }

});
