import Component from '@glimmer/component';
import DeletePostsModal from './modals/delete-posts';
import EditPostsAccessModal from './modals/edit-posts-access';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class PostsContextMenu extends Component {
    @service ajax;
    @service ghostPaths;
    @service session;
    @service infinity;
    @service modals;
    @service store;

    get menu() {
        return this.args.menu;
    }

    get selectionList() {
        return this.menu.selectionList;
    }

    @action
    async deletePosts() {
        this.menu.close();
        await this.modals.open(DeletePostsModal, {
            isSingle: this.selectionList.isSingle,
            count: this.selectionList.count,
            confirm: this.deletePostsTask
        });
    }

    @action
    async editPostsAccess() {
        this.menu.close();
        await this.modals.open(EditPostsAccessModal, {
            isSingle: this.selectionList.isSingle,
            count: this.selectionList.count,
            confirm: this.editPostsAccessTask
        });
    }

    @task
    *deletePostsTask(close) {
        const deletedModels = this.selectionList.availableModels;
        yield this.performBulkDestroy();
        const remainingModels = this.selectionList.infinityModel.content.filter((model) => {
            return !deletedModels.includes(model);
        });
        // Deleteobjects method from infintiymodel is broken for all models except the first page, so we cannot use this
        this.infinity.replace(this.selectionList.infinityModel, remainingModels);
        this.selectionList.clearSelection();
        close();

        return true;
    }

    @task
    *editPostsAccessTask(close, {visibility, tiers}) {
        const updatedModels = this.selectionList.availableModels;
        yield this.performBulkEdit('access', {visibility, tiers});

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: 'post',
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

        close();

        return true;
    }

    async performBulkDestroy() {
        const filter = this.selectionList.filter;
        let bulkUpdateUrl = this.ghostPaths.url.api(`posts`) + `?filter=${encodeURIComponent(filter)}`;
        return await this.ajax.delete(bulkUpdateUrl);
    }

    async performBulkEdit(_action, meta = {}) {
        const filter = this.selectionList.filter;
        let bulkUpdateUrl = this.ghostPaths.url.api(`posts/bulk`) + `?filter=${encodeURIComponent(filter)}`;
        return await this.ajax.put(bulkUpdateUrl, {
            data: {
                bulk: {
                    action: _action,
                    meta
                }
            }
        });
    }

    get shouldFeatureSelection() {
        const firstPost = this.selectionList.availableModels[0];
        if (!firstPost) {
            return true;
        }
        return !firstPost.featured;
    }

    get canFeatureSelection() {
        if (!this.selectionList.isSingle) {
            return true;
        }
        return this.selectionList.availableModels[0].get('status') !== 'sent';
    }

    @action
    async featurePosts() {
        const updatedModels = this.selectionList.availableModels;
        await this.performBulkEdit('feature');

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: 'post',
                    attributes: {
                        featured: true
                    }
                }
            });
        }

        // Close the menu
        this.menu.close();
    }

    @action
    async unfeaturePosts() {
        const updatedModels = this.selectionList.availableModels;
        await this.performBulkEdit('unfeature');

        // Update the models on the client side
        for (const post of updatedModels) {
            // We need to do it this way to prevent marking the model as dirty
            this.store.push({
                data: {
                    id: post.id,
                    type: 'post',
                    attributes: {
                        featured: false
                    }
                }
            });
        }

        // Close the menu
        this.menu.close();
    }
}
