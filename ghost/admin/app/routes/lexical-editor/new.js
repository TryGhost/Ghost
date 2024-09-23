import * as Sentry from '@sentry/ember';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {action} from '@ember/object';
import {scheduleOnce} from '@ember/runloop';

export default class NewRoute extends AuthenticatedRoute {
    model(params, transition) {
        let {type: modelName} = params;

        if (!['post','page'].includes(modelName)) {
            let path = transition.intent.url.replace(/^\//, '');
            return this.replaceWith('error404', {path, status: 404});
        }

        return this.store.createRecord(modelName, {authors: [this.session.user]});
    }

    // there's no specific controller for this route, instead all editor
    // handling is done on the editor route/controller
    setupController(controller, newPost) {
        // logging here because at this stage the controller has definitely not
        // had a hand in doing anything to the post
        if (!newPost.isNew) {
            console.error('New post route did not generate a new model'); // eslint-disable-line no-console
        }

        let editor = this.controllerFor('lexical-editor');
        editor.setPost(newPost);
    }

    // We've seen rare occurrences of getting a newly created model with
    // isNew: false which will result in errors when saving because it tries
    // a PUT request with no id. This is a safety check to get out of that bad
    // state to avoid potential data loss from failed post creation saves.
    //
    // Because we trigger a browser refresh to get out of this state we need to
    // have completed the transition so the refresh occurs on the right URL which
    // is why we do this in `didTransition` rather than earlier hooks.
    @action
    didTransition() {
        const controller = this.controllerFor('lexical-editor');
        const post = controller.post;

        if (!post.isNew) {
            const newPostAttempt = this.store?.createRecord('post', {authors: [this.session.user]});

            console.error('New post route transitioned with post.isNew=false', {recreatedPostIsGood: newPostAttempt.isNew}); // eslint-disable-line no-console
            Sentry.captureMessage('New post route transitioned with post.isNew=false', {tags: {savePostTask: true}, extra: {recreatedPostIsGood: newPostAttempt.isNew}});

            // still need to schedule the refresh to allow the transition to fully complete and URL to update
            scheduleOnce('afterRender', this, windowProxy.reload);
        }
    }

    buildRouteInfoMetadata() {
        return {
            mainClasses: ['editor-new']
        };
    }
}
