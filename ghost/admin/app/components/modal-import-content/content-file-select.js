import Component from '@glimmer/component';
import {UnsupportedMediaTypeError} from 'ghost-admin/services/ajax';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class ContentFileSelect extends Component {
    labelText = 'Select or drop a JSON or zip file';

    @tracked error = null;
    @tracked dragClass = null;

    /*
    constructor(...args) {
        super(...args);
        assert(this.args.setFile);
    }
    */

    @action
    fileSelected(fileList) {
        let [file] = Array.from(fileList);

        try {
            this._validateFileType(file);
            this.error = null;
        } catch (err) {
            this.error = err;
            return;
        }

        this.args.setFile(file);
    }

    @action
    dragOver(event) {
        if (!event.dataTransfer) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        if (navigator.userAgent.indexOf('Chrome') > -1) {
            let eA = event.dataTransfer.effectAllowed;
            event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';
        }

        event.stopPropagation();
        event.preventDefault();

        this.dragClass = '-drag-over';
    }

    @action
    dragLeave(event) {
        event.preventDefault();
        this.dragClass = null;
    }

    @action
    drop(event) {
        event.preventDefault();
        this.dragClass = null;
        if (event.dataTransfer.files) {
            this.fileSelected(event.dataTransfer.files);
        }
    }

    _validateFileType(file) {
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

        if (extension.toLowerCase() !== 'json' && extension.toLowerCase() !== 'zip') {
            throw new UnsupportedMediaTypeError({
                message: 'The file type you uploaded is not supported'
            });
        }

        return true;
    }
}
