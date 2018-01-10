import $ from 'jquery';
import Mixin from '@ember/object/mixin';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import styleBody from 'ghost-admin/mixins/style-body';
import {run} from '@ember/runloop';

let generalShortcuts = {};

generalShortcuts[`${ctrlOrCmd}+shift+p`] = 'publish';

export default Mixin.create(styleBody, ShortcutsRoute, {
    classNames: ['editor'],

    shortcuts: generalShortcuts,

    actions: {
        save() {
            let selectedElement = $(document.activeElement);

            if (selectedElement.is('input[type="text"]')) {
                selectedElement.trigger('focusout');
            }

            run.scheduleOnce('actions', this, function () {
                this.get('controller').send('save');
            });
        },

        publish() {
            let controller = this.get('controller');

            controller.send('setSaveType', 'publish');
            controller.send('save');
        },

        willTransition(transition) {
            let controller = this.get('controller');
            let scratch = controller.get('post.scratch');
            let controllerIsDirty = controller.get('hasDirtyAttributes');
            let post = controller.get('post');
            let state = post.getProperties('isDeleted', 'isSaving', 'hasDirtyAttributes', 'isNew');

            if (this.get('upgradeStatus.isRequired')) {
                return this._super(...arguments);
            }

            let fromNewToEdit = this.get('routeName') === 'editor.new'
                && transition.targetName === 'editor.edit'
                && transition.intent.contexts
                && transition.intent.contexts[0]
                && transition.intent.contexts[0].id === post.get('id');

            let deletedWithoutChanges = state.isDeleted
                && (state.isSaving || !state.hasDirtyAttributes);

            if (!fromNewToEdit && !deletedWithoutChanges && controllerIsDirty) {
                transition.abort();
                controller.send('toggleLeaveEditorModal', transition);
                return;
            }

            // The controller may hold post state that will be lost in the
            // new->edit transition, so we need to apply it now.
            if (fromNewToEdit && controllerIsDirty) {
                if (scratch !== post.get('mobiledoc')) {
                    post.set('mobiledoc', scratch);
                }
            }

            // make sure the save tasks aren't still running in the background
            // after leaving the edit route
            // TODO: the edit screen should really be a component so that we get
            // automatic state cleanup and task cancellation
            controller.send('cancelAutosave');

            if (state.isNew) {
                post.deleteRecord();
            }

            // since the transition is now certain to complete..
            window.onbeforeunload = null;

            // remove post-related listeners created in editor-base-route
            this.detachModelHooks(controller, post);
        }
    },

    attachModelHooks(controller, post) {
        // this will allow us to track when the post is saved and update the controller
        // so that we can be sure controller.hasDirtyAttributes is correct, without having to update the
        // controller on each instance of `post.save()`.
        //
        // another reason we can't do this on `post.save().then()` is because the post-settings-menu
        // also saves the post, and passing messages is difficult because we have two
        // types of editor controllers, and the PSM also exists on the posts.post route.
        //
        // The reason we can't just keep this functionality in the editor controller is
        // because we need to remove these handlers on `willTransition` in the editor route.
        post.on('didCreate', controller, controller.get('postSaved'));
        post.on('didUpdate', controller, controller.get('postSaved'));
    },

    detachModelHooks(controller, post) {
        post.off('didCreate', controller, controller.get('postSaved'));
        post.off('didUpdate', controller, controller.get('postSaved'));
    },

    setupController(controller, post) {
        let tags = post.get('tags');

        post.set('scratch', post.get('mobiledoc'));
        post.set('titleScratch', post.get('title'));

        // reset the leave editor transition so new->edit will still work
        controller.set('leaveEditorTransition', null);

        this._super(...arguments);

        if (tags) {
            // used to check if anything has changed in the editor
            controller.set('previousTagNames', tags.mapBy('name'));
        } else {
            controller.set('previousTagNames', []);
        }

        // trigger an immediate autosave timeout if post has changed between
        // new->edit (typical as first save will only contain the first char)
        // so that leaving the route waits for save instead of showing the
        // "Are you sure you want to leave?" modal unexpectedly
        if (!post.get('isNew') && post.get('hasDirtyAttributes')) {
            controller.get('_autosave').perform();
        }

        // reset save-on-first-change (gh-koenig specific)
        // controller._hasChanged = false;

        // attach post-related listeners created in editor-base-route
        this.attachModelHooks(controller, post);
    }
});
