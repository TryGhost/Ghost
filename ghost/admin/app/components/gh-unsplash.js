/* global key */
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const ONE_COLUMN_WIDTH = 540;
const TWO_COLUMN_WIDTH = 940;

export default class GhUnsplash extends Component {
    @service unsplash;
    @service ui;

    @tracked zoomedPhoto = null;
    @tracked searchTerm = null;

    get sideNavHidden() {
        return this.ui.isFullScreen || this.ui.showMobileMenu;
    }

    constructor() {
        super(...arguments);
        key.setScope('unsplash');
    }

    willDestroy() {
        super.willDestroy(...arguments);
        key.setScope('default');
    }

    @action
    loadNextPage() {
        this.unsplash.loadNextPage();
    }

    @action
    search(event) {
        event.preventDefault();
        const term = event.target.value;
        this.unsplash.updateSearch(term);
        this.closeZoom();
    }

    @action
    clearSearch(event, ekEvent) {
        if (event.target.value) {
            ekEvent.stopPropagation();
            this.unsplash.updateSearch('');
        }
    }

    @action
    zoomPhoto(photo) {
        this.zoomedPhoto = photo;
    }

    @action
    closeZoom(event) {
        event?.preventDefault?.();
        this.zoomedPhoto = null;
    }

    @action
    select(photo) {
        this.unsplash.triggerDownload(photo);

        let selectParams = {
            src: photo.urls.regular.replace(/&w=1080/, '&w=2000'),
            width: photo.width,
            height: photo.height,
            alt: photo.description || '',
            caption: `Photo by <a href="${photo.user.links.html}?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">${photo.user.name}</a> / <a href="https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit">Unsplash</a>`
        };
        this.args.select(selectParams);

        this.args.close();
    }

    @action
    retry(event) {
        event?.preventDefault();
        this.unsplash.retryLastRequest();
    }

    @action
    handleEscape(event) {
        event?.preventDefault();

        if (this.zoomedPhoto) {
            return this.closeZoom();
        }

        this.args.close();
    }

    @action
    handleResize(element) {
        let width = element.clientWidth;
        let columns = 3;

        if (width <= ONE_COLUMN_WIDTH) {
            columns = 1;
        } else if (width <= TWO_COLUMN_WIDTH) {
            columns = 2;
        }

        this.unsplash.changeColumnCount(columns);
    }
}
