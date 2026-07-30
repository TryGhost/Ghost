import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PostsListTagEditor extends Component {
    @service notifications;
    @service session;

    @tracked draftTags = [];
    @tracked visibleTagCount = 0;

    resizeObserver;
    openedAtUpdatedAt;

    get tags() {
        return this.args.post.tags?.toArray() || [];
    }

    get canEdit() {
        return !this.session.user.isContributor || this.args.post.isDraft;
    }

    get overflowCount() {
        return Math.max(0, this.tags.length - this.visibleTagCount);
    }

    get overflowTagNames() {
        return this.overflowTags.map(tag => tag.name).join(', ');
    }

    get overflowTags() {
        return this.tags.slice(this.visibleTagCount);
    }

    get lastDraftTagIndex() {
        return this.draftTags.length - 1;
    }

    @action
    setupOverflow(element) {
        this.tagListElement = element;
        this.resizeObserver = new ResizeObserver(() => this.measureOverflow());
        this.resizeObserver.observe(element);
        requestAnimationFrame(() => this.measureOverflow());
    }

    @action
    teardownOverflow() {
        this.resizeObserver?.disconnect();
    }

    measureOverflow() {
        if (!this.tagListElement) {
            return;
        }

        const availableWidth = this.tagListElement.querySelector('.gh-post-list-tags-visible')?.clientWidth || 0;
        const tagWidths = [...this.tagListElement.querySelectorAll('[data-tag-measure]')]
            .map(element => element.getBoundingClientRect().width);
        const overflowWidth = this.tagListElement.querySelector('[data-overflow-measure]')?.getBoundingClientRect().width || 0;
        const gap = 4;
        let usedWidth = 0;
        let visibleCount = 0;

        for (let index = 0; index < tagWidths.length; index += 1) {
            const remaining = tagWidths.length - index - 1;
            const reservedOverflow = remaining > 0 ? overflowWidth + gap : 0;
            const nextWidth = tagWidths[index] + (visibleCount > 0 ? gap : 0);

            if (usedWidth + nextWidth + reservedOverflow > availableWidth) {
                break;
            }

            usedWidth += nextWidth;
            visibleCount += 1;
        }

        if (this.visibleTagCount !== visibleCount) {
            this.visibleTagCount = visibleCount;
        }
    }

    @action
    openEditor() {
        if (this.args.post.hasDirtyAttributes) {
            this.notifications.showNotification('This post has unsaved changes. Save or discard them before editing tags.', {type: 'error'});
            return false;
        }

        this.draftTags = [...this.tags];
        this.openedAtUpdatedAt = this.args.post.updatedAtUTC?.valueOf();
    }

    @action
    updateTags(tags) {
        this.draftTags = [...tags];
    }

    @action
    moveTag(tag, offset) {
        const currentIndex = this.draftTags.indexOf(tag);
        const nextIndex = currentIndex + offset;

        if (currentIndex === -1 || nextIndex < 0 || nextIndex >= this.draftTags.length) {
            return;
        }

        const tags = [...this.draftTags];
        tags.splice(currentIndex, 1);
        tags.splice(nextIndex, 0, tag);
        this.draftTags = tags;
    }

    @action
    cancel(dropdown) {
        dropdown.actions.close();
    }

    @action
    closeEditor() {
        this.destroyUnusedNewTags();
    }

    @task({drop: true})
    *saveTags(dropdown) {
        const post = this.args.post;
        const oldTags = [...this.tags];
        const currentUpdatedAt = post.updatedAtUTC?.valueOf();

        if (post.hasDirtyAttributes || currentUpdatedAt !== this.openedAtUpdatedAt) {
            this.notifications.showNotification('This post changed while tags were being edited. Reopen the tag editor and try again.', {type: 'error'});
            return;
        }

        post.set('tags', this.draftTags);

        try {
            yield post.save();
            dropdown.actions.close();
            this.notifications.showNotification('Tags updated.', {type: 'success'});
            return true;
        } catch (error) {
            post.set('tags', oldTags);
            this.notifications.showAPIError(error, {key: `post.${post.id}.tags`});
            return false;
        } finally {
            this.destroyUnusedNewTags();
        }
    }

    destroyUnusedNewTags() {
        const savedTags = new Set(this.tags);
        this.draftTags.forEach((tag) => {
            if (tag.isNew && !savedTags.has(tag)) {
                tag.destroyRecord();
            }
        });
    }
}
