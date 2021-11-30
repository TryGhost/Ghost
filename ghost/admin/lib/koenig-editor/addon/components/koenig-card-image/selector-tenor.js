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

    @tracked highlightedGif;

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
        this.highlightedGif = undefined;
    }

    @action
    highlightFirst() {
        this.highlightedGif = this.tenor.gifs[0];
    }

    @action
    highlightNext() {
        if (this.highlightedGif === this.tenor.gifs[this.tenor.gifs.length - 1]) {
            // reached the end, do nothing
            return;
        }

        this.highlightedGif = this.tenor.gifs[this.highlightedGif.index + 1];
    }

    @action
    highlightPrev() {
        if (this.highlightedGif.index === 0) {
            // reached the beginning, focus the search bar
            return this.focusSearch();
        }

        this.highlightedGif = this.tenor.gifs[this.highlightedGif.index - 1];
    }

    @action
    moveHighlightDown() {
        const nextGif = this.tenor.columns[this.highlightedGif.columnIndex][this.highlightedGif.columnRowIndex + 1];

        if (nextGif) {
            this.highlightedGif = nextGif;
        }
    }

    @action
    moveHighlightUp() {
        const nextGif = this.tenor.columns[this.highlightedGif.columnIndex][this.highlightedGif.columnRowIndex - 1];

        if (nextGif) {
            this.highlightedGif = nextGif;
        } else {
            // already at top, focus the search bar
            return this.focusSearch();
        }
    }

    @action
    moveHighlightRight() {
        if (this.highlightedGif.columnIndex === this.tenor.columns.length - 1) {
            // we don't wrap and we're on the last column, do nothing
            return;
        }

        this._moveToNextHorizontalGif('right');
    }

    @action
    moveHighlightLeft() {
        if (this.highlightedGif.index === 0) {
            // on the first Gif, focus the search bar
            return this.focusSearch();
        }

        if (this.highlightedGif.columnIndex === 0) {
            // we don't wrap and we're on the first column, do nothing
            return;
        }

        this._moveToNextHorizontalGif('left');
    }

    _moveToNextHorizontalGif(direction) {
        const highlightedElem = document.querySelector(`[data-tenor-index="${this.highlightedGif.index}"]`);
        const highlightedElemRect = highlightedElem.getBoundingClientRect();

        let x;
        if (direction === 'left') {
            x = highlightedElemRect.left - (highlightedElemRect.width / 2);
        } else {
            x = highlightedElemRect.right + (highlightedElemRect.width / 2);
        }

        let y = highlightedElemRect.top + (highlightedElemRect.height / 3);

        let foundGifElem;
        let jumps = 0;

        // we might hit spacing between gifs, keep moving up 5 px until we get a match
        while (!foundGifElem) {
            let possibleMatch = document.elementFromPoint(x, y)?.closest('[data-tenor-index]');

            if (possibleMatch?.dataset.tenorIndex !== undefined) {
                foundGifElem = possibleMatch;
                break;
            }

            jumps += 1;
            y -= 5;

            if (jumps > 10) {
                // give up to avoid infinite loop
                break;
            }
        }

        if (foundGifElem) {
            this.highlightedGif = this.tenor.gifs[foundGifElem.dataset.tenorIndex];
        }
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
            this.moveHighlightLeft();
        }
    }

    @onKey('ArrowRight')
    handleRight(event) {
        if (this.highlightedGif) {
            event.preventDefault();
            this.moveHighlightRight();
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
