import ModalComponent from 'ghost-admin/components/modal-base';
import diff from 'node-htmldiff';

export default ModalComponent.extend({

    get previous() {
        return `<h1> Hello this is the past </h1>`;
    },

    get current() {
        return `<h1> Hello this is the future </h1>`;
    },
     
    get postDiff() {
        let diffHtml = diff(this.previous, this.current);
        return diffHtml;
    }
});
