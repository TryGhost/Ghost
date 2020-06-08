import Component from '@ember/component';
import config from 'ghost-admin/config/environment';
import {action, computed} from '@ember/object';
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
    attributeBindings: ['disabled', 'form', 'type', 'tabindex'],

    task: null,
    taskArgs: undefined,
    disabled: false,
    defaultClick: false,
    buttonText: 'Save',
    idleClass: '',
    runningClass: '',
    showSuccess: true, // set to false if you want the spinner to show until a transition occurs
    autoReset: true, // set to false if you want don't want task button to reset after timeout
    successText: 'Saved',
    successClass: 'gh-btn-green',
    failureText: 'Retry',
    failureClass: 'gh-btn-red',

    isTesting: undefined,

    // Allowed actions
    action: () => {},

    runningText: reads('buttonText'),

    // hasRun is needed so that a newly rendered button does not show the last
    // state of the associated task
    hasRun: computed('task.performCount', function () {
        return this.get('task.performCount') > this._initialPerformCount;
    }),

    isIdleClass: computed('isIdle', function () {
        return this.isIdle ? this.idleClass : '';
    }),

    isRunning: computed('task.last.isRunning', 'hasRun', 'showSuccess', function () {
        let taskName = this.get('task.name');
        let lastTaskName = this.get('task.last.task.name');

        let isRunning = (taskName === lastTaskName) && this.get('task.last.isRunning');
        if (this.hasRun && (taskName === lastTaskName) && this.get('task.last.value') && !this.showSuccess) {
            isRunning = true;
        }

        return isRunning;
    }),

    isRunningClass: computed('isRunning', function () {
        return this.isRunning ? (this.runningClass || this.idleClass) : '';
    }),

    isSuccess: computed('hasRun', 'isRunning', 'task.last.value', function () {
        let taskName = this.get('task.name');
        let lastTaskName = this.get('task.last.task.name');

        if (!this.hasRun || this.isRunning || !this.showSuccess) {
            return false;
        }

        let value = this.get('task.last.value');
        return (taskName === lastTaskName) && !isBlank(value) && value !== false;
    }),

    isSuccessClass: computed('isSuccess', function () {
        return this.isSuccess ? this.successClass : '';
    }),

    isFailure: computed('hasRun', 'isRunning', 'isSuccess', 'task.last.error', function () {
        let taskName = this.get('task.name');
        let lastTaskName = this.get('task.last.task.name');

        if (!this.hasRun || this.isRunning || this.isSuccess) {
            return false;
        }

        return (taskName === lastTaskName) && this.get('task.last.error') !== undefined;
    }),

    isFailureClass: computed('isFailure', function () {
        return this.isFailure ? this.failureClass : '';
    }),

    isIdle: computed('isRunning', 'isSuccess', 'isFailure', function () {
        return !this.isRunning && !this.isSuccess && !this.isFailure;
    }),

    init() {
        this._super(...arguments);
        this._initialPerformCount = this.get('task.performCount');
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    },

    click() {
        // let the default click bubble if defaultClick===true - useful when
        // you want to handle a form submit action rather than triggering a
        // task directly
        if (this.defaultClick) {
            if (!this.isRunning) {
                this._restartAnimation.perform();
            }
            return;
        }

        // do nothing if disabled externally
        if (this.disabled) {
            return false;
        }

        let taskName = this.get('task.name');
        let lastTaskName = this.get('task.last.task.name');

        // task-buttons are never disabled whilst running so that clicks when a
        // taskGroup is running don't get dropped BUT that means we need to check
        // here to avoid spamming actions from multiple clicks
        if (this.isRunning && taskName === lastTaskName) {
            return;
        }
        this.action();
        this._handleMainTask.perform();

        this._restartAnimation.perform();

        // prevent the click from bubbling and triggering form actions
        return false;
    },

    // mouseDown can be prevented, this is useful for situations where we want
    // to avoid on-blur events triggering before the button click
    mouseDown(event) {
        if (this.disableMouseDown) {
            event.preventDefault();
        }
    },

    handleReset: action(function () {
        const isTaskSuccess = this.get('task.last.isSuccessful') && this.get('task.last.value');
        if (this.autoReset && this.showSuccess && isTaskSuccess) {
            this._resetButtonState.perform();
        }
    }),

    // when local validation fails there's no transition from failed->running
    // so we want to restart the retry spinner animation to show something
    // has happened when the button is clicked
    _restartAnimation: task(function* () {
        let elem = this.element.querySelector('.retry-animated');
        if (elem) {
            elem.classList.remove('retry-animated');
            yield timeout(10);
            elem.classList.add('retry-animated');
        }
    }),

    _handleMainTask: task(function* () {
        this._resetButtonState.cancelAll();
        yield this.task.perform(this.taskArgs);
        const isTaskSuccess = this.get('task.last.isSuccessful') && this.get('task.last.value');
        if (this.autoReset && this.showSuccess && isTaskSuccess) {
            this._resetButtonState.perform();
        }
    }),

    _resetButtonState: task(function* () {
        yield timeout(this.isTesting ? 50 : 2500);
        if (!this.get('task.last.isRunning')) {
            // Reset last task to bring button back to idle state
            yield this.set('task.last', null);
        }
    }).restartable()
});

export default GhTaskButton;
