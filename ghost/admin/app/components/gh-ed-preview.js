import Ember from 'ember';
import Component from 'ember-component';
import EmberObject from 'ember-object';
import run from 'ember-runloop';
import {A as emberA} from 'ember-array/utils';
import {formatMarkdown} from 'ghost-admin/helpers/gh-format-markdown';

// ember-cli-shims doesn't export uuid
const {uuid} = Ember;

export default Component.extend({
    _scrollWrapper: null,

    previewHTML: '',

    init() {
        this._super(...arguments);
        this.set('imageUploadComponents', emberA([]));
        this.buildPreviewHTML();
    },

    didInsertElement() {
        this._super(...arguments);
        this._scrollWrapper = this.$().closest('.entry-preview-content');
        this.adjustScrollPosition(this.get('scrollPosition'));
    },

    didReceiveAttrs(attrs) {
        this._super(...arguments);

        if (!attrs.oldAttrs) {
            return;
        }

        if (attrs.newAttrs.scrollPosition && attrs.newAttrs.scrollPosition.value !== attrs.oldAttrs.scrollPosition.value) {
            this.adjustScrollPosition(attrs.newAttrs.scrollPosition.value);
        }

        if (attrs.newAttrs.markdown.value !== attrs.oldAttrs.markdown.value) {
            run.throttle(this, this.buildPreviewHTML, 30, false);
        }
    },

    adjustScrollPosition(scrollPosition) {
        let scrollWrapper = this._scrollWrapper;

        if (scrollWrapper) {
            scrollWrapper.scrollTop(scrollPosition);
        }
    },

    buildPreviewHTML() {
        let markdown = this.get('markdown');
        let html = formatMarkdown([markdown]).string;
        let template = document.createElement('template');
        template.innerHTML = html;
        let fragment = template.content;
        let dropzones = fragment.querySelectorAll('.js-drop-zone');
        let components = this.get('imageUploadComponents');

        if (dropzones.length !== components.length) {
            components = emberA([]);
            this.set('imageUploadComponents', components);
        }

        [...dropzones].forEach((oldEl, i) => {
            let el = oldEl.cloneNode(true);
            let component = components[i];
            let uploadTarget = el.querySelector('.js-upload-target');
            let altTextWrapper = oldEl.querySelector('.js-drop-zone .description strong');
            let id = uuid();
            let destinationElementId = `image-uploader-${id}`;
            let src, altText;

            if (uploadTarget) {
                src = uploadTarget.getAttribute('src');
            }

            if (altTextWrapper) {
                altText = altTextWrapper.innerHTML;
            }

            if (component) {
                component.set('destinationElementId', destinationElementId);
                component.set('src', src);
                component.set('altText', altText);
            } else {
                let imageUpload = EmberObject.create({
                    destinationElementId,
                    id,
                    src,
                    altText,
                    index: i
                });

                this.get('imageUploadComponents').pushObject(imageUpload);
            }

            el.id = destinationElementId;
            el.innerHTML = '';
            el.classList.remove('image-uploader');

            oldEl.parentNode.replaceChild(el, oldEl);
        });

        this.set('previewHTML', fragment);
    },

    actions: {
        updateImageSrc(index, url) {
            this.attrs.updateImageSrc(index, url);
        },

        updateHeight() {
            this.attrs.updateHeight(this.$().height());
        }
    }
});
