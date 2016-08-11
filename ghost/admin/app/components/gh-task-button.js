import {reads} from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';

import SpinButton from './gh-spin-button';
import layout from 'ghost-admin/templates/components/gh-spin-button';

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
export default SpinButton.extend({
    layout, // This is used to we don't have to re-implement the template

    task: null,

    submitting: reads('task.last.isRunning'),

    click() {
        invokeAction(this, 'action');

        return this.get('task').perform();
    }
});
