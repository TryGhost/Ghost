import Ember from 'ember';

export default Ember.Component.extend({
    content: null,
    prompt: null,
    optionValuePath: 'id',
    optionLabelPath: 'title',
    selection: null,
    action: Ember.K, // action to fire on change

    // shadow the passed-in `selection` to avoid
    // leaking changes to it via a 2-way binding
    _selection: Ember.computed.reads('selection'),

    actions: {
        change: function () {
            var selectEl = this.$('select')[0],
                selectedIndex = selectEl.selectedIndex,
                content = this.get('content'),

                // decrement index by 1 if we have a prompt
                hasPrompt = !!this.get('prompt'),
                contentIndex = hasPrompt ? selectedIndex - 1 : selectedIndex,

                selection = content.objectAt(contentIndex);

            // set the local, shadowed selection to avoid leaking
            // changes to `selection` out via 2-way binding
            this.set('_selection', selection);

            this.sendAction('action', selection);
        }
    }
});
