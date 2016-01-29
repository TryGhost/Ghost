import Ember from 'ember';

const {Component, computed} = Ember;
const {reads} = computed;

function K() {
    return this;
}

export default Component.extend({
    content: null,
    prompt: null,
    optionValuePath: 'id',
    optionLabelPath: 'title',
    selection: null,
    action: K, // action to fire on change

    // shadow the passed-in `selection` to avoid
    // leaking changes to it via a 2-way binding
    _selection: reads('selection'),

    actions: {
        change() {
            // jscs:disable requireArrayDestructuring
            let selectEl = this.$('select')[0];
            // jscs:enable requireArrayDestructuring
            let {selectedIndex} = selectEl;

            // decrement index by 1 if we have a prompt
            let hasPrompt = !!this.get('prompt');
            let contentIndex = hasPrompt ? selectedIndex - 1 : selectedIndex;

            let selection = this.get('content').objectAt(contentIndex);

            // set the local, shadowed selection to avoid leaking
            // changes to `selection` out via 2-way binding
            this.set('_selection', selection);

            this.sendAction('action', selection);
        }
    }
});
