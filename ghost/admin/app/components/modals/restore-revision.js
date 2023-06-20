import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class RestoreRevisionModal extends Component {
    @service notifications;

    get pageType() {
        return this.args.data.post.isPost ? 'post' : 'page';
    }

    get title() {
        return this.args.data.post.isPublished === true
            ? `Restore version for published ${this.pageType}?`
            : `Restore this version?`;
    }

    get body() {
        return this.args.data.post.isPublished === true
            ? htmlSafe(`
                Heads up! This ${this.pageType} has already been <strong>published</strong>, restoring a previous
                version will automatically update the ${this.pageType} on your site.
            `)
            : `Replace your existing draft with this version of the ${this.pageType}.`;
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

            yield post.save({adapterOptions: {saveRevision: true}});

            updateTitle();
            updateEditor();

            this.notifications.showNotification('Revision successfully restored.', {type: 'success'});

            closePostHistoryModal();

            return true;
        } catch (error) {
            this.notifications.showNotification('Failed to restore revision.', {type: 'error'});
        } finally {
            this.args.close();
        }
    }
}
