import Component from 'ember-component';
import observer from 'ember-metal/observer';
import {reads} from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';

/**
 * Task Button works exactly like Spin button, but with one major difference:
 *
 * Instead of passing a "submitting" parameter (which is bound to the parent object),
 * you pass an ember-concurrency task. All of the "submitting" behavior is handled automatically.
 *
 * As another bonus, there's no need to handle canceling the promises when something
 * like a controller changes. Because the only task running is handled through this
 * component, all running promises will automatically be cancelled when this
 * component is removed from the DOM
 */
export default Component.extend({
    tagName: 'button',
    classNameBindings: ['isRunning:appear-disabled'],
    attributeBindings: ['disabled', 'type', 'tabindex'],

    task: null,
    disabled: false,

    isRunning: reads('task.last.isRunning'),

    click() {
        // do nothing if disabled externally
        if (this.get('disabled')) {
            return false;
        }

        let task = this.get('task');
        let taskName = this.get('task.name');
        let lastTaskName = this.get('task.last.task.name');

        // task-buttons are never disabled whilst running so that clicks when a
        // taskGroup is running don't get dropped BUT that means we need to check
        // here to avoid spamming actions from multiple clicks
        if (this.get('isRunning') && taskName === lastTaskName) {
            return;
        }

        invokeAction(this, 'action');

        return task.perform();
    },

    setSize: observer('isRunning', function () {
        if (this.get('isRunning')) {
            this.$().width(this.$().width());
            this.$().height(this.$().height());
        } else {
            this.$().width('');
            this.$().height('');
        }
    })
});
