import AuthenticatedRoute from 'ghost/routes/authenticated';
import base from 'ghost/mixins/editor-route-base';

var EditorEditRoute = AuthenticatedRoute.extend(base, {
    classNames: ['editor'],

    model: function (params) {
        var self = this,
            post,
            postId;

        postId = Number(params.post_id);

        if (!Number.isInteger(postId) || !Number.isFinite(postId) || postId <= 0) {
            this.transitionTo('error404', 'editor/' + params.post_id);
        }

        post = this.store.getById('post', postId);

        if (post) {
            return post;
        }

        return this.store.find('post', {
            id: params.post_id,
            status: 'all',
            staticPages: 'all',
            include: 'tags'
        }).then(function (records) {
            var post = records.get('firstObject');

            if (post) {
                return post;
            }

            return self.transitionTo('posts.index');
        });
    },

    serialize: function (model) {
        return {post_id: model.get('id')};
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        controller.set('scratch', model.get('markdown'));
        // used to check if anything has changed in the editor
        controller.set('previousTagNames', model.get('tags').mapBy('name'));
    },

    actions: {
        willTransition: function (transition) {
            var controller = this.get('controller'),
                isDirty = controller.get('isDirty'),

                model = controller.get('model'),
                isSaving = model.get('isSaving'),
                isDeleted = model.get('isDeleted'),
                modelIsDirty = model.get('isDirty');

            // when `isDeleted && isSaving`, model is in-flight, being saved
            // to the server. when `isDeleted && !isSaving && !modelIsDirty`,
            // the record has already been deleted and the deletion persisted.
            //
            // in either case  we can probably just transition now.
            // in the former case the server will return the record, thereby updating it.
            // @TODO: this will break if the model fails server-side validation.
            if (!(isDeleted && isSaving) && !(isDeleted && !isSaving && !modelIsDirty) && isDirty) {
                transition.abort();
                this.send('openModal', 'leave-editor', [controller, transition]);
                return;
            }

            // since the transition is now certain to complete..
            window.onbeforeunload = null;
        }
    }
});

export default EditorEditRoute;
