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
            this.transitionTo('posts.index');
        }

        post = this.store.getById('post', postId);

        if (post) {
            return post;
        }

        return this.store.filter('post', { status: 'all', staticPages: 'all' }, function (post) {
            //post.get('id') returns a string, so compare with params.post_id
            return post.get('id') === params.post_id;
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

        model.get('tags').then(function (tags) {
            // used to check if anything has changed in the editor
            controller.set('previousTagNames', tags.mapBy('name'));
        });
    },

    actions: {
        willTransition: function (transition) {
            var controller = this.get('controller'),
                isDirty = controller.get('isDirty'),

                model = controller.get('model'),
                isSaving = model.get('isSaving'),
                isDeleted = model.get('isDeleted');

            // when `isDeleted && isSaving`, model is in-flight, being saved
            // to the server. in that case  we can probably just transition
            // now and have the server return the record, thereby updating it
            if (!(isDeleted && isSaving) && isDirty) {
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
