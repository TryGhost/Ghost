import Component from '@ember/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {debounce, run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),

    ui: service(),

    classNameBindings: [
        'isDraggedOver:-drag-over',
        'isFullScreen:gh-editor-fullscreen',
        'isPreview:gh-editor-preview'
    ],

    // Internal attributes
    droppedFiles: null,
    headerHeight: 0,
    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,
    isDraggedOver: false,
    isFullScreen: false,
    isSplitScreen: false,
    uploadedImageUrls: null,

    // Private
    _dragCounter: 0,
    _onResizeHandler: null,
    _viewActionsWidth: 190,

    actions: {
        toggleFullScreen(isFullScreen) {
            this.set('isFullScreen', isFullScreen);
            this.ui.set('isFullScreen', isFullScreen);
        },

        togglePreview(isPreview) {
            this.set('isPreview', isPreview);
        },

        toggleSplitScreen(isSplitScreen) {
            this.set('isSplitScreen', isSplitScreen);
        },

        uploadImages(fileList, resetInput) {
            // convert FileList to an array so that resetting the input doesn't
            // clear the file references before upload actions can be triggered
            let files = Array.from(fileList);
            this.set('droppedFiles', files);
            resetInput();
        },

        uploadComplete(uploads) {
            this.set('uploadedImageUrls', uploads.mapBy('url'));
            this.set('droppedFiles', null);
        },

        uploadCancelled() {
            this.set('droppedFiles', null);
        }
    },

    _setHeaderHeight() {
        if (this.headerClass && this._editorTitleElement) {
            let height = this._editorTitleElement.offsetHeight;
            return this.set('headerHeight', height);
        }

        this.set('headerHeight', 0);
    },

    // dragOver is needed so that drop works
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

        event.preventDefault();
        event.stopPropagation();
    },

    // dragEnter is needed so that the drag class is correctly removed
    dragEnter(event) {
        if (!event.dataTransfer) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        // the counter technique prevents flickering of the drag class when
        // dragging across child elements
        this._dragCounter += 1;

        this.set('isDraggedOver', true);
    },

    dragLeave(event) {
        event.preventDefault();
        event.stopPropagation();

        this._dragCounter -= 1;
        if (this._dragCounter === 0) {
            this.set('isDraggedOver', false);
        }
    },

    drop(event) {
        event.preventDefault();
        event.stopPropagation();

        this._dragCounter = 0;
        this.set('isDraggedOver', false);

        if (event.dataTransfer.files) {
            this.set('droppedFiles', event.dataTransfer.files);
        }
    }
});
