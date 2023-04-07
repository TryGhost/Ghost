import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PostsContextMenu extends Component {
    @service ajax;
    @service ghostPaths;

    get menu() {
        return this.args.menu;
    }

    get selectionList() {
        return this.menu.selectionList;
    }

    @action
    deletePosts() {
        // Use filter in menu.selectionList.filter
        alert('Deleting posts not yet supported.');
        this.menu.close();
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

    @action
    async featurePosts() {
        const updatedModels = this.selectionList.availableModels;
        await this.performBulkEdit('feature');

        // Update the models on the client side
        for (const post of updatedModels) {
            post.set('featured', true);
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
            post.set('featured', false);
        }

        // Close the menu
        this.menu.close();
    }
}
