/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import Ember from 'ember';
import EmberSelectizeComponent from 'ember-cli-selectize/components/ember-selectize';

const {computed, isArray, isBlank, get, run} = Ember;
const emberA = Ember.A;

export default EmberSelectizeComponent.extend({

    selectizeOptions: computed(function () {
        let options = this._super(...arguments);

        options.onChange = run.bind(this, '_onChange');

        return options;
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
        let reorderedSelection = emberA([]);

        if (!args || !selection || !isArray(selection) || args.length !== get(selection, 'length')) {
            return;
        }

        // exit if we're not dealing with the same objects as the selection
        let objectsHaveChanged = selection.any(function (obj) {
            return args.indexOf(get(obj, valuePath)) === -1;
        });

        if (objectsHaveChanged) {
            return;
        }

        // exit if the order is still the same
        let orderIsSame = selection.every(function (obj, idx) {
            return get(obj, valuePath) === args[idx];
        });

        if (orderIsSame) {
            return;
        }

        // we have a re-order, update the selection
        args.forEach((value) => {
            let obj = selection.find(function (item) {
                return `${get(item, valuePath)}` === value;
            });

            if (obj) {
                reorderedSelection.addObject(obj);
            }
        });

        this.set('selection', reorderedSelection);
    },

    _preventOpeningWhenBlank() {
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
    },

    didInsertElement() {
        this._super(...arguments);
        this._preventOpeningWhenBlank();
    }

});
