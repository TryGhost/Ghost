import AddPostTagsModal from './modals/add-tag';
import Component from '@glimmer/component';
import DeletePostsModal from './modals/delete-posts';
import EditPostsAccessModal from './modals/edit-posts-access';
import UnpublishPostsModal from './modals/unpublish-posts';
import nql from '@tryghost/nql';
import {action} from '@ember/object';
import {capitalizeFirstLetter} from 'ghost-admin/helpers/capitalize-first-letter';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

/**
 * @tryghost/tpl doesn't work in admin yet (Safari)
 */
function tpl(str, data) {
    for (const key in data) {
        str = str.replace(new RegExp(`{${key}}`, 'g'), data[key]);
    }
    return str;
}

const messages = {
    deleted: {
        single: '{Type} deleted',
        multiple: '{count} {type}s deleted'
    },
    unpublished: {
        single: '{Type} reverted to a draft',
        multiple: '{count} {type}s reverted to drafts'
    },
    accessUpdated: {
        single: '{Type} access updated',
        multiple: '{Type} access updated for {count} {type}s'
    },
    tagsAdded: {
        single: 'Tags added',
        multiple: 'Tags added to {count} {type}s'
    },
    tagAdded: {
        single: 'Tag added',
        multiple: 'Tag added to {count} {type}s'
    },
    duplicated: {
        single: '{Type} duplicated',
        multiple: '{count} {type}s duplicated'
    }
};

export default class PostsContextMenu extends Component {
    @service ajax;
    @service ghostPaths;
    @service session;
    @service infinity;
    @service store;
    @service notifications;
    @service membersUtils;

    get menu() {
        return this.args.menu;
    }

    get selectionList() {
        return this.menu.selectionList;
    }

    get type() {
        return this.selectionList.first?.displayName === 'page' ? 'page' : 'post';
    }

    #getToastMessage(type) {
        if (this.selectionList.isSingle) {
            return tpl(messages[type].single, {count: this.selectionList.count, type: this.type, Type: capitalizeFirstLetter(this.type)});
        }
        return tpl(messages[type].multiple, {count: this.selectionList.count, type: this.type, Type: capitalizeFirstLetter(this.type)});
    }

    @action
    async featurePosts() {
        this.menu.performTask(this.featurePostsTask);
    }

    @action
    async unfeaturePosts() {
        this.menu.performTask(this.unfeaturePostsTask);
    }

    @action
    async addTagToPosts() {
        await this.menu.openModal(AddPostTagsModal, {
            type: this.type,
            selectionList: this.selectionList,
            confirm: this.addTagToPostsTask
        });
    }

    @action
    async deletePosts() {
        this.menu.openModal(DeletePostsModal, {
            type: this.type,
            selectionList: this.selectionList,
            confirm: this.deletePostsTask
        });
    }

    @action
    async unpublishPosts() {
        await this.menu.openModal(UnpublishPostsModal, {
            type: this.type,
            selectionList: this.selectionList,
            confirm: this.unpublishPostsTask
        });
    }

    @action
    async editPostsAccess() {
        this.menu.openModal(EditPostsAccessModal, {
            type: this.type,
            selectionList: this.selectionList,
            confirm: this.editPostsAccessTask
        });
    }

    @action
    async copyPosts() {
        this.menu.performTask(this.copyPostsTask);
    }

    @task
    *addTagToPostsTask(tags) {
        const updatedModels = this.selectionList.availableModels;

        yield this.performBulkEdit('addTag', {
            tags: tags.map((t) => {
                return {
                    id: t.id,
                    name: t.name,
                    slug: t.slug
                };
            })
        });
        if (tags.length > 1) {
            this.notifications.showNotification(this.#getToastMessage('tagsAdded'), {type: 'success'});
        } else {
            this.notifications.showNotification(this.#getToastMessage('tagAdded'), {type: 'success'});
        }

        const serializedTags = tags.toArray().map((t) => {
            return {
                ...t.serialize({includeId: true}),
                type: 'tag'
            };
        });

        // Destroy unsaved new tags (otherwise we could select them again)
        this.store.peekAll('tag').forEach((tag) => {
            if (tag.isNew) {
                tag.destroyRecord();
            }
        });

        // For new tags, attach the id to it, so we can link the new tag to the post
        let allTags = null;

        for (const tag of serializedTags) {
            if (!tag.id) {
                if (!allTags) {
                    // Update tags on the client side (we could have created new tags)
                    yield this.store.query('tag', {limit: 'all'});
                    allTags = this.store.peekAll('tag').toArray();
                }
                const createdTag = allTags.find(t => t.name === tag.name && t.id);
                if (createdTag) {
                    tag.id = createdTag.id;
                    tag.slug = createdTag.slug;
                }
            }
        }

        // Update the models on the client side
        for (const post of updatedModels) {
            const newTags = post.tags.toArray().map((t) => {
                return {
                    ...t.serialize({includeId: true}),
                    type: 'tag'
                };
            });
            for (const tag of serializedTags) {
                if (!newTags.find(t => t.id === tag.id)) {
                    newTags.push(tag);
                }
            }

            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: this.type,
                    relationships: {
                        tags: {
                            data: newTags
                        }
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    @task
    *deletePostsTask() {
        const deletedModels = this.selectionList.availableModels;
        yield this.performBulkDestroy();
        this.notifications.showNotification(this.#getToastMessage('deleted'), {type: 'success'});

        const remainingModels = this.selectionList.infinityModel.content.filter((model) => {
            return !deletedModels.includes(model);
        });
        // Deleteobjects method from infintiymodel is broken for all models except the first page, so we cannot use this
        this.infinity.replace(this.selectionList.infinityModel, remainingModels);
        this.selectionList.clearSelection({force: true});
        return true;
    }

    @task
    *unpublishPostsTask() {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('unpublish');
        this.notifications.showNotification(this.#getToastMessage('unpublished'), {type: 'success'});

        // Update the models on the client side
        for (const post of updatedModels) {
            if (post.status === 'published') {
                // We need to do it this way to prevent marking the model as dirty
                this.store.push({
                    data: {
                        id: post.id,
                        type: this.type,
                        attributes: {
                            status: 'draft'
                        }
                    }
                });
            }
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    updateFilteredPosts() {
        const updatedModels = this.selectionList.availableModels;
        const filter = this.selectionList.allFilter;
        const filterNql = nql(filter, {
            expansions: [
                {
                    key: 'primary_tag',
                    replacement: 'tags.slug',
                    expansion: 'posts_tags.sort_order:0+tags.visibility:public'
                }, {
                    key: 'primary_author',
                    replacement: 'authors.slug',
                    expansion: 'posts_authors.sort_order:0+authors.visibility:public'
                }, {
                    key: 'authors',
                    replacement: 'authors.slug'
                }, {
                    key: 'author',
                    replacement: 'authors.slug'
                }, {
                    key: 'tag',
                    replacement: 'tags.slug'
                }, {
                    key: 'tags',
                    replacement: 'tags.slug'
                }
            ]
        });

        const remainingModels = this.selectionList.infinityModel.content.filter((model) => {
            if (!updatedModels.find(u => u.id === model.id)) {
                return true;
            }
            return filterNql.queryJSON(model.serialize({includeId: true}));
        });
        // Deleteobjects method from infintiymodel is broken for all models except the first page, so we cannot use this
        this.infinity.replace(this.selectionList.infinityModel, remainingModels);

        this.selectionList.clearUnavailableItems();
    }

    @task
    *editPostsAccessTask(close, {visibility, tiers}) {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('access', {visibility, tiers});
        this.notifications.showNotification(this.#getToastMessage('accessUpdated'), {type: 'success'});

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: this.type,
                    attributes: {
                        visibility
                    },
                    relationships: {
                        links: {
                            data: tiers
                        }
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        close();
    }

    @task
    *featurePostsTask() {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('feature');

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: this.type,
                    attributes: {
                        featured: true
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    @task
    *unfeaturePostsTask() {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('unfeature');

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: this.type,
                    attributes: {
                        featured: false
                    }
                }
            });
        }

        // Remove posts that no longer match the filter
        this.updateFilteredPosts();

        return true;
    }

    @task
    *copyPostsTask() {
        try {
            const result = yield this.performCopy();

            // Add to the store and retrieve model
            this.store.pushPayload(result);

            const data = result[this.type === 'post' ? 'posts' : 'pages'][0];
            const model = this.store.peekRecord(this.type, data.id);

            // Update infinity list
            this.selectionList.infinityModel.content.unshiftObject(model);

            // Show notification
            this.notifications.showNotification(this.#getToastMessage('duplicated'), {type: 'success'});
        } catch (error) {
            this.notifications.showAPIError(error, {key: `${this.type}.copy.failed`});
        }

        return true;
    }

    async performBulkDestroy() {
        const filter = this.selectionList.filter;
        let bulkUpdateUrl = this.ghostPaths.url.api(this.type === 'post' ? 'posts' : 'pages') + `?filter=${encodeURIComponent(filter)}`;
        return await this.ajax.delete(bulkUpdateUrl);
    }

    async performBulkEdit(_action, meta = {}) {
        const filter = this.selectionList.filter;
        let bulkUpdateUrl = this.ghostPaths.url.api(this.type === 'post' ? 'posts/bulk' : 'pages/bulk') + `?filter=${encodeURIComponent(filter)}`;
        return await this.ajax.put(bulkUpdateUrl, {
            data: {
                bulk: {
                    action: _action,
                    meta
                }
            }
        });
    }

    async performCopy() {
        const id = this.selectionList.availableModels[0].id;
        const copyUrl = this.ghostPaths.url.api(`${this.type === 'post' ? 'posts' : 'pages'}/${id}/copy`) + '?formats=mobiledoc,lexical';
        return await this.ajax.post(copyUrl);
    }

    get shouldFeatureSelection() {
        let featuredCount = 0;
        for (const m of this.selectionList.availableModels) {
            if (m.featured) {
                featuredCount += 1;
            }
        }
        return featuredCount <= this.selectionList.availableModels.length / 2;
    }

    get canFeatureSelection() {
        for (const m of this.selectionList.availableModels) {
            if (m.get('status') !== 'sent') {
                return true;
            }
        }
        return false;
    }

    get canUnpublishSelection() {
        for (const m of this.selectionList.availableModels) {
            if (m.status === 'published') {
                return true;
            }
        }
        return false;
    }

    get canCopySelection() {
        return this.selectionList.availableModels.length === 1;
    }
}
