/* global key */
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const ONE_COLUMN_WIDTH = 540;
const TWO_COLUMN_WIDTH = 940;

export default class GhMediaLibrary extends Component {
    @service mediaLibrary;
    @service ui;

    @tracked searchTerm = null;

    get sideNavHidden() {
        return this.ui.isFullScreen || this.ui.showMobileMenu;
    }

    constructor() {
        super(...arguments);
        key.setScope('mediaLibrary');
    }

    willDestroy() {
        super.willDestroy(...arguments);
        key.setScope('default');
    }

    @action
    loadNextPage() {
        this.mediaLibrary.loadNextPage();
    }

    @action
    search(event) {
        event.preventDefault();
        const term = event.target.value;
        
        this.mediaLibrary.updateSearch(term);
    }

    @action
    clearSearch(event, ekEvent) {
        if (event.target.value) {
            ekEvent.stopPropagation();
            this.mediaLibrary.updateSearch('');
        }
    }

    @action
    select(photo) {
        let selectParams = {
            src: photo.image,
            width: photo.width,
            height: photo.height,
            alt: '',
            caption: photo.caption
        };

        this.args.select(selectParams);

        this.args.close();
    }

    @action
    retry(event) {
        event?.preventDefault();
        this.mediaLibrary.retryLastRequest();
    }

    @action
    handleEscape(event) {
        event?.preventDefault();

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

        this.mediaLibrary.changeColumnCount(columns);
    }
}
