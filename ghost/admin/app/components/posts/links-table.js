import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const PAGE_SIZE = 5;

export default class LinksTable extends Component {
    @tracked page = 1;

    @tracked editingLink = false;

    @action
    blurElement(event) {
        if (!event.shiftKey) {
            event.preventDefault();
            event.target.blur();
        }
    }

    @action
    editLink(linkId) {
        this.editingLink = linkId;
    }

    @action
    cancelEdit(event) {
        event.preventDefault();
        this.editingLink = null;
        // event.target.value = this.args.post[property];
        // event.target.blur();
    }

    @action
    setLink(event) {
        event.preventDefault();
        this.args.updateLink(this.editingLink, event.target.value);
        this.editingLink = null;
        // const title = event.target.value;
        // this.args.post.title = title.trim();
        // this.args.post.save();
        // this.editingLink = false;
    }

    get links() {
        return this.args.links;
    }

    get visibleLinks() {
        return this.links.slice(this.startOffset - 1, this.endOffset).map((link) => {
            return {
                ...link,
                isEditing: this.editingLink === link.link.link_id
            };
        });
    }

    get startOffset() {
        return (this.page - 1) * PAGE_SIZE + 1;
    }

    get endOffset() {
        return Math.min(this.page * PAGE_SIZE, this.links.length);
    }

    get totalPages() {
        return Math.ceil(this.links.length / PAGE_SIZE);
    }

    get totalLinks() {
        return this.links.length;
    }

    get showPagination() {
        return this.totalPages > 1;
    }

    get disablePreviousPage() {
        return this.page === 1;
    }

    get disableNextPage() {
        return this.page === this.totalPages;
    }

    @action
    openPreviousPage() {
        if (this.disablePreviousPage) {
            return;
        }
        this.page -= 1;
    }

    @action
    openNextPage() {
        if (this.disableNextPage) {
            return;
        }

        this.page += 1;
    }
}
