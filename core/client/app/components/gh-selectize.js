import Ember from 'ember';
import EmberSelectizeComponent from 'ember-cli-selectize/components/ember-selectize';

export default EmberSelectizeComponent.extend({

    _dontOpenWhenBlank: Ember.on('didInsertElement', function () {
        var openOnFocus = this.get('openOnFocus');

        if (!openOnFocus) {
            Ember.run.next(this, function () {
                var selectize = this._selectize;
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
            });
        }
    }),

    /**
    * Event callback that is triggered when user creates a tag
    * - modified to pass the caret position to the action
    */
    _create(input, callback) {
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
    }

});
