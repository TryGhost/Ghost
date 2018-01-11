import Component from '@ember/component';
import {computed} from '@ember/object';
import {invokeAction} from 'ember-invoke-action';
import {isBlank} from '@ember/utils';
import {reads} from '@ember/object/computed';
import {task, timeout} from 'ember-concurrency';

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
const GhTaskButton = Component.extend({
    tagName: 'button',
    classNameBindings: [
        'isRunning:appear-disabled',
        'isIdleClass',
        'isRunningClass',
        'isSuccessClass',
        'isFailureClass'
    ],
    attributeBindings: ['disabled', 'type', 'tabindex'],

    task: null,
    disabled: false,
    buttonText: 'Save',
    idleClass: '',
    runningClass: '',
    successText: 'Saved',
    successClass: 'gh-btn-green',
    failureText: 'Retry',
    failureClass: 'gh-btn-red',

    isRunning: reads('task.last.isRunning'),
    runningText: reads('buttonText'),

    // hasRun is needed so that a newly rendered button does not show the last
    // state of the associated task
    hasRun: computed('task.performCount', function () {
        return this.get('task.performCount') > this._initialPerformCount;
    }),

    isIdleClass: computed('isIdle', function () {
        if (this.get('isIdle')) {
            return this.get('idleClass');
        }
    }),

    isRunningClass: computed('isRunning', function () {
        if (this.get('isRunning')) {
            return this.get('runningClass') || this.get('idleClass');
        }
    }),

    isSuccess: computed('hasRun', 'isRunning', 'task.last.value', function () {
        if (!this.get('hasRun') || this.get('isRunning')) {
            return false;
        }

        let value = this.get('task.last.value');
        return !isBlank(value) && value !== false;
    }),

    isSuccessClass: computed('isSuccess', function () {
        if (this.get('isSuccess')) {
            return this.get('successClass');
        }
    }),

    isFailure: computed('hasRun', 'isRunning', 'isSuccess', 'task.last.error', function () {
        if (!this.get('hasRun') || this.get('isRunning') || this.get('isSuccess')) {
            return false;
        }

        return this.get('task.last.error') !== undefined;
    }),

    isFailureClass: computed('isFailure', function () {
        if (this.get('isFailure')) {
            return this.get('failureClass');
        }
    }),

    isIdle: computed('isRunning', 'isSuccess', 'isFailure', function () {
        return !this.get('isRunning') && !this.get('isSuccess') && !this.get('isFailure');
    }),

    init() {
        this._super(...arguments);
        this._initialPerformCount = this.get('task.performCount');
    },

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
        task.perform();

        this.get('_restartAnimation').perform();

        // prevent the click from bubbling and triggering form actions
        return false;
    },

    // when local validation fails there's no transition from failed->running
    // so we want to restart the retry spinner animation to show something
    // has happened when the button is clicked
    _restartAnimation: task(function* () {
        if (this.$('.retry-animated').length) {
            // eslint-disable-next-line
            let elem = this.$('.retry-animated')[0];
            elem.classList.remove('retry-animated');
            yield timeout(10);
            elem.classList.add('retry-animated');
        }
    })
});

GhTaskButton.reopenClass({
    positionalParams: ['buttonText']
});

export default GhTaskButton;
