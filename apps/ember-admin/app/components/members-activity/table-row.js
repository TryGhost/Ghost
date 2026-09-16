import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class TableRow extends Component {
    linkScrollerTimeout = null; // needs to be global so can be cleared when needed across functions

    @action
    enterLinkURL(event) {
        event.stopPropagation();
        const parent = event.target;
        const child = event.target.querySelector('span');

        clearTimeout(this.linkScrollerTimeout);
        if (child.offsetWidth > parent.offsetWidth) {
            this.linkScrollerTimeout = setTimeout(() => {
                parent.classList.add('scroller');
                child.style.transform = `translateX(-${(child.offsetWidth - parent.offsetWidth) + 8}px)`;
            }, 100);
        }
    }

    @action
    leaveLinkURL(event) {
        event.stopPropagation();
        clearTimeout(this.linkScrollerTimeout);
        const parent = event.target;
        const child = event.target.querySelector('span');

        child.style.transform = 'translateX(0)';
        parent.classList.remove('scroller');
    }
}