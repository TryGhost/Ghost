import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class RestoreRevisionModal extends Component {
    @service feature;
    @service notifications;

    get title() {
        return this.args.data.post.isPublished === true
            ? `Restore version for published ${this.args.data.post.displayName}?`
            : `Restore this version?`;
    }

    get body() {
        return this.args.data.post.isPublished === true
            ? htmlSafe(`
                Heads up! This ${this.args.data.post.displayName} has already been <strong>published</strong>, restoring a previous
                version will automatically update the ${this.args.data.post.displayName} on your site.
            `)
            : `Replace your existing draft with this version of the ${this.args.data.post.displayName}.`;
    }

    @task
    *restoreRevisionTask() {
        try {
            const {
                post,
                revision,
                updateTitle,
                updateEditor,
                closePostHistoryModal
            } = this.args.data;

            post.lexical = revision.lexical;
            post.title = revision.title;
            post.featureImage = revision.feature_image;
            post.featureImageAlt = revision.feature_image_alt;
            post.featureImageCaption = revision.feature_image_caption;

            if (this.feature.editorExcerpt) {
                post.customExcerpt = revision.custom_excerpt;
            }

            yield post.save({adapterOptions: {saveRevision: true}});

            updateTitle();
            updateEditor();

            this.notifications.showNotification('Revision restored.', {type: 'success'});

            closePostHistoryModal();

            return true;
        } catch (error) {
            this.notifications.showNotification('Failed to restore revision.', {type: 'error'});
        } finally {
            this.args.close();
        }
    }
}
