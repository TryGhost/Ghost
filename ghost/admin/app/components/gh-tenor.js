import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhTenorComponent extends Component {
    @service tenor;

    @tracked zoomedGif;

    @action
    search(event) {
        const term = event.target.value;
        this.tenor.updateSearch(term);
        this.closeZoom();
    }

    @action
    setInitialSearch() {
        if (this.args.searchTerm !== this.tenor.searchTerm) {
            this.tenor.updateSearch(this.args.searchTerm);
        }
    }

    @action
    zoom(gif, event) {
        event?.preventDefault();
        this.zoomedGif = gif;
    }

    @action
    closeZoom(event) {
        event?.preventDefault();
        this.zoomedGif = null;
    }

    @action
    select(gif, event) {
        event?.preventDefault();
        event?.stopPropagation();

        const media = gif.media[0].gif;

        const selectParams = {
            src: media.url,
            width: media.dims[0],
            height: media.dims[1],
            caption: '(Via <a href="https://tenor.com">Tenor</a>)'
        };

        this.args.select(selectParams);
        this.args.close();
    }

    @action
    handleEscape() {
        if (this.zoomedGif) {
            this.zoomedGif = null;
        } else {
            this.args.close();
        }
    }
}
