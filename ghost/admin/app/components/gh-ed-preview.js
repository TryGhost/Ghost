import Ember from 'ember';

const {
    $,
    Component,
    run,
    uuid
} = Ember;

export default Component.extend({
    _scrollWrapper: null,

    init() {
        this._super(...arguments);
        this.set('imageUploadComponents', Ember.A([]));
    },

    didInsertElement() {
        this._super(...arguments);
        this._scrollWrapper = this.$().closest('.entry-preview-content');
        this.adjustScrollPosition(this.get('scrollPosition'));
        run.scheduleOnce('afterRender', this, this.registerImageUploadComponents);
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
            // we need to clear the rendered components as we are unable to
            // retain a reliable reference for the component's position in the
            // document
            // TODO: it may be possible to extract the dropzones and use the
            // image src as a key, re-connecting any that match and
            // dropping/re-rendering any unknown/no-source instances
            this.set('imageUploadComponents', Ember.A([]));
            run.scheduleOnce('afterRender', this, this.registerImageUploadComponents);
        }
    },

    adjustScrollPosition(scrollPosition) {
        let scrollWrapper = this._scrollWrapper;

        if (scrollWrapper) {
            scrollWrapper.scrollTop(scrollPosition);
        }
    },

    registerImageUploadComponents() {
        let dropzones = $('.js-drop-zone');

        dropzones.each((i, el) => {
            let id = uuid();
            let destinationElementId = `image-uploader-${id}`;
            let src = $(el).find('.js-upload-target').attr('src');

            let imageUpload = Ember.Object.create({
                destinationElementId,
                id,
                src,
                index: i
            });

            el.id = destinationElementId;
            $(el).empty();
            $(el).removeClass('image-uploader');

            run.schedule('afterRender', () => {
                this.get('imageUploadComponents').pushObject(imageUpload);
            });
        });
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
