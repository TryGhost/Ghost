import Controller from '@ember/controller';
import DeleteTagModal from '../components/tags/delete-tag-modal';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class TagController extends Controller {
    @service modals;
    @service notifications;
    @service router;
    @inject config;

    get tag() {
        return this.model;
    }

    get tagURL() {
        const blogUrl = this.config.blogUrl;
        const tagSlug = this.tag?.slug || '';

        let tagURL = this.tag?.canonicalUrl || `${blogUrl}/tag/${tagSlug}`;

        if (!tagURL.endsWith('/')) {
            tagURL += '/';
        }

        return tagURL;
    }

    @action
    confirmDeleteTag() {
        return this.modals.open(DeleteTagModal, {
            tag: this.model
        });
    }

    @task({drop: true})
    *saveTask() {
        let {tag} = this;

        try {
            if (tag.get('errors').length !== 0) {
                return;
            }
            yield tag.save();

            // replace 'new' route with 'tag' route
            this.replaceRoute('tag', tag);

            return tag;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'tag.save'});
            }
        }
    }
}
