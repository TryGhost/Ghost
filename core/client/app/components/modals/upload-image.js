import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';
import upload from 'ghost/assets/lib/uploader';
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

const {
    computed,
    inject: {service},
    isEmpty
} = Ember;

export default ModalComponent.extend({
    acceptEncoding: 'image/*',
    model: null,
    submitting: false,

    config: service(),
    notifications: service(),

    imageUrl: computed('model.model', 'model.imageProperty', {
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

    didInsertElement() {
        this._super(...arguments);
        upload.call(this.$('.js-drop-zone'), {
            fileStorage: this.get('config.fileStorage')
        });
    },

    keyDown() {
        this._setErrorState(false);
    },

    _setErrorState(state) {
        if (state) {
            this.$('.js-upload-url').addClass('error');
        } else {
            this.$('.js-upload-url').removeClass('error');
        }
    },

    _setImageProperty() {
        let value;

        if (this.$('.js-upload-url').val()) {
            value = this.$('.js-upload-url').val();

            if (!isEmpty(value) && !cajaSanitizers.url(value)) {
                this._setErrorState(true);
                return {message: 'Image URI is not valid'};
            }
        } else {
            value = this.$('.js-upload-target').attr('src');
        }

        this.set('imageUrl', value);
        return true;
    },

    actions: {
        confirm() {
            let model = this.get('model.model');
            let notifications = this.get('notifications');
            let result = this._setImageProperty();

            if (!result.message) {
                this.set('submitting', true);

                model.save().catch((err) => {
                    notifications.showAPIError(err, {key: 'image.upload'});
                }).finally(() => {
                    this.send('closeModal');
                });
            }
        }
    }
});
