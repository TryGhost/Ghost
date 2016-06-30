import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {isEmpty} from 'ember-utils';
import ModalComponent from 'ghost-admin/components/modals/base';
import cajaSanitizers from 'ghost-admin/utils/caja-sanitizers';

export default ModalComponent.extend({
    model: null,
    submitting: false,

    url: '',
    newUrl: '',

    config: injectService(),
    notifications: injectService(),

    image: computed('model.model', 'model.imageProperty', {
        get() {
            let imageProperty = this.get('model.imageProperty');

            return this.get(`model.model.${imageProperty}`);
        },

        set(key, value) {
            let model = this.get('model.model');
            let imageProperty = this.get('model.imageProperty');

            return model.set(imageProperty, value);
        }
    }),

    didReceiveAttrs() {
        let image = this.get('image');
        this.set('url', image);
        this.set('newUrl', image);
    },

    // TODO: should validation be handled in the gh-image-uploader component?
    //  pro - consistency everywhere, simplification here
    //  con - difficult if the "save" is happening externally as it does here
    //
    //  maybe it should be handled at the model level?
    //      - automatically present everywhere
    //      - file uploads should always result in valid urls so it should only
    //        affect the url input form
    keyDown() {
        this._setErrorState(false);
    },

    _setErrorState(state) {
        if (state) {
            this.$('.url').addClass('error');
        } else {
            this.$('.url').removeClass('error');
        }
    },

    _validateUrl(url) {
        if (!isEmpty(url) && !cajaSanitizers.url(url)) {
            this._setErrorState(true);
            return {message: 'Image URI is not valid'};
        }

        return true;
    },
    // end validation

    actions: {
        fileUploaded(url) {
            this.set('url', url);
            this.set('newUrl', url);
        },

        removeImage() {
            this.set('url', '');
            this.set('newUrl', '');
        },

        confirm() {
            let model = this.get('model.model');
            let newUrl = this.get('newUrl');
            let result = this._validateUrl(newUrl);
            let notifications = this.get('notifications');

            if (result === true) {
                this.set('submitting', true);
                this.set('image', newUrl);

                model.save().catch((err) => {
                    notifications.showAPIError(err, {key: 'image.upload'});
                }).finally(() => {
                    this.send('closeModal');
                });
            }
        }
    }
});
