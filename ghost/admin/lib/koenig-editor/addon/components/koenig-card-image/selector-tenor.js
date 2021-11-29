import Component from '@glimmer/component';
import {action} from '@ember/object';
import {keyResponder, onKey} from 'ember-keyboard';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

// number of columns based on selector container width
const TWO_COLUMN_WIDTH = 540;
const THREE_COLUMN_WIDTH = 940;

@keyResponder
export default class KoenigCardImageTenorSelector extends Component {
    @service tenor;

    @tracked highlightedColumnIndex;
    @tracked highlightedRowIndex;

    get highlightedGif() {
        if (this.highlightedColumnIndex === undefined || this.highlightedRowIndex === undefined) {
            return null;
        }

        return this.tenor.columns[this.highlightedColumnIndex][this.highlightedRowIndex];
    }

    get highlightedColumn() {
        return this.tenor.columns[this.highlightedColumnIndex];
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._resizeObserver?.disconnect();
    }

    @action
    search(event) {
        const term = event.target.value;
        this.tenor.updateSearch(term);
        this.clearHighlight();
    }

    @action
    didInsertContainer(containerElem) {
        this.containerElem = containerElem;

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

        this.args.select(payload);
    }

    @action
    focusSearch() {
        this.containerElem?.querySelector('input')?.focus();
    }

    @action
    clearHighlight() {
        this.highlightedColumnIndex = undefined;
        this.highlightedRowIndex = undefined;
    }

    @action
    highlightFirst() {
        this.highlightedColumnIndex = 0;
        this.highlightedRowIndex = 0;
    }

    @action
    highlightNext() {
        if (this.highlightedColumnIndex === this.tenor.columns.length - 1) {
            // at the end of a row, drop down to the next one
            const newColumn = 0;
            const newRow = this.highlightedRowIndex + 1;

            if (newRow >= this.tenor.columns[newColumn].length) {
                // reached the end, do nothing
                return;
            }

            this.highlightedColumnIndex = newColumn;
            this.highlightedRowIndex = newRow;
        } else {
            // mid-row, move to next column
            this.highlightedColumnIndex += 1;
        }
    }

    @action
    highlightPrev() {
        if (this.highlightedColumnIndex === 0) {
            // at the start of a row, jump up to the prev one
            const newColumn = this.tenor.columns.length - 1;
            const newRow = this.highlightedRowIndex - 1;

            if (newRow < 0) {
                // reached the beginning, focus the search bar
                return this.focusSearch();
            }

            this.highlightedColumnIndex = newColumn;
            this.highlightedRowIndex = newRow;
        } else {
            // mid-row, move to prev column
            this.highlightedColumnIndex -= 1;
        }
    }

    @action
    moveHighlightDown() {
        if (this.highlightedRowIndex === this.highlightedColumn.length - 1) {
            // aready at bottom, do nothing
            return;
        }

        this.highlightedRowIndex += 1;
    }

    @action
    moveHighlightUp() {
        if (this.highlightedRowIndex === 0) {
            // already at top, focus to the search bar
            return this.focusSearch();
        }

        this.highlightedRowIndex -= 1;
    }

    @onKey('Tab')
    handleTab(event) {
        if (event.shiftKey) {
            if (this.highlightedGif) {
                event.preventDefault();
                return this.highlightPrev();
            }
        } else {
            if (event?.target.tagName === 'INPUT') {
                event.preventDefault();
                event.target.blur();
                return this.highlightFirst();
            }

            if (this.highlightedGif) {
                event?.preventDefault();
                return this.highlightNext();
            }
        }
    }

    @onKey('ArrowLeft')
    handleLeft(event) {
        if (this.highlightedGif) {
            event.preventDefault();
            this.highlightPrev();
        }
    }

    @onKey('ArrowRight')
    handleRight(event) {
        if (this.highlightedGif) {
            event.preventDefault();
            this.highlightNext();
        }
    }

    @onKey('ArrowUp')
    handleUp(event) {
        if (this.highlightedGif) {
            event.preventDefault();
            this.moveHighlightUp();
        }
    }

    @onKey('ArrowDown')
    handleDown(event) {
        if (event.target.tagName === 'INPUT') {
            event.preventDefault();
            event.target.blur();
            return this.highlightFirst();
        }

        if (this.highlightedGif) {
            event.preventDefault();
            this.moveHighlightDown();
        }
    }

    @onKey('Enter')
    handleEnter(event) {
        event.preventDefault();

        if (event.target.tagName === 'INPUT') {
            event.target.blur();
            return this.highlightFirst();
        }

        if (this.highlightedGif) {
            return this.select(this.highlightedGif);
        }
    }
}
