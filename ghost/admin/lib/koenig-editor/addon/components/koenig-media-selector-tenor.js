import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

// number of columns based on selector container width
const TWO_COLUMN_WIDTH = 540;
const THREE_COLUMN_WIDTH = 940;

export default class KoenigMediaSelectorTenorComponent extends Component {
    @service tenor;

    willDestroy() {
        super.willDestroy(...arguments);
        this._resizeObserver?.disconnect();
    }

    @action
    search(event) {
        const term = event.target.value;
        this.tenor.updateSearch(term);
    }

    @action
    didInsertContainer(containerElem) {
        if (this.args.searchTerm !== this.tenor.searchTerm) {
            this.tenor.updateSearch(this.args.searchTerm);
        }

        this._resizeObserver = new ResizeObserver((entries) => {
            const [containerEntry] = entries;
            const contentBoxSize = Array.isArray(containerEntry.contentBoxSize) ? containerEntry.contentBoxSize[0] : containerEntry.contentBoxSize;

            const width = contentBoxSize.inlineSize;

            let columns = 4;

            if (width <= TWO_COLUMN_WIDTH) {
                columns = 2;
            } else if (width <= THREE_COLUMN_WIDTH) {
                columns = 3;
            }

            this.tenor.changeColumnCount(columns);
        });
        this._resizeObserver.observe(containerElem);
    }

    @action
    select(gif, event) {
        event?.preventDefault();
        event?.stopPropagation();

        const media = gif.media[0].gif;

        const payload = {
            src: media.url,
            width: media.dims[0],
            height: media.dims[1],
            caption: '',
            type: 'gif'
        };

        this.args.selector.insertCard('image', payload);
        this.args.selector.close();
    }
}
