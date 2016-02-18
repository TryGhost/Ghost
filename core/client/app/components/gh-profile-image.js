import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service},
    run
} = Ember;
const {notEmpty} = computed;

/**
 * A component to manage a user profile image. By default it just handles picture uploads,
 * but if passed a bound 'email' property it will render the user's gravatar image
 *
 * Example: {{gh-profile-image email=controllerEmailProperty setImage="controllerActionName" debounce=500}}
 *
 * @param  {int}            size              The size of the image to render
 * @param  {String}         email             Reference to a bound email object if gravatar image behavior is desired.
 * @param  {String|action}  setImage          The string name of the action on the controller to be called when an image is added.
 * @param  {int}            debounce          Period to wait after changes to email before attempting to load gravatar
 * @property  {Boolean}     hasUploadedImage  Whether or not the user has uploaded an image (whether or not to show the default image/gravatar image)
 * @property  {String}      defaultImage      String containing the background-image css property of the default user profile image
 * @property  {String}      imageBackground   String containing the background-image css property with the gravatar url
 */
export default Component.extend({
    email: '',
    size: 90,
    debounce: 300,

    validEmail: '',
    hasUploadedImage: false,
    fileStorage: true,

    ghostPaths: service(),
    displayGravatar: notEmpty('validEmail'),

    init() {
        this._super(...arguments);
        // Fire this immediately in case we're initialized with a valid email
        this.trySetValidEmail();
    },

    defaultImage: computed('ghostPaths', function () {
        let url = `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    trySetValidEmail() {
        if (!this.get('isDestroyed')) {
            let email = this.get('email');
            this.set('validEmail', validator.isEmail(email) ? email : '');
        }
    },

    didReceiveAttrs(attrs) {
        this._super(...arguments);
        let timeout = parseInt(attrs.newAttrs.throttle || this.get('debounce'));
        run.debounce(this, 'trySetValidEmail', timeout);
    },

    imageBackground: computed('validEmail', 'size', function () {
        let email = this.get('validEmail');
        let size = this.get('size');

        let style = '';
        if (email) {
            let url = `//www.gravatar.com/avatar/${window.md5(email)}?s=${size}&d=blank`;
            style = `background-image: url(${url})`;
        }
        return Ember.String.htmlSafe(style);
    }),

    didInsertElement() {
        let size = this.get('size');
        let uploadElement = this.$('.js-file-input');

        this._super(...arguments);

        // while theoretically the 'add' and 'processalways' functions could be
        // added as properties of the hash passed to fileupload(), for some reason
        // they needed to be placed in an on() call for the add method to work correctly
        uploadElement.fileupload({
            url: this.get('ghostPaths.url').api('uploads'),
            dropZone: this.$('.js-img-dropzone'),
            previewMaxHeight: size,
            previewMaxWidth: size,
            previewCrop: true,
            maxNumberOfFiles: 1,
            autoUpload: false
        })
        .on('fileuploadadd', run.bind(this, this.queueFile))
        .on('fileuploadprocessalways', run.bind(this, this.triggerPreview));
    },

    willDestroyElement() {
        let $input = this.$('.js-file-input');

        this._super(...arguments);

        if ($input.length && $input.data()['blueimp-fileupload']) {
            $input.fileupload('destroy');
        }
    },

    queueFile(e, data) {
        let fileName = data.files[0].name;

        if ((/\.(gif|jpe?g|png|svg?z)$/i).test(fileName)) {
            this.sendAction('setImage', data);
        }
    },

    triggerPreview(e, data) {
        let file = data.files[data.index];

        if (file.preview) {
            this.set('hasUploadedImage', true);
            // necessary jQuery code because file.preview is a raw DOM object
            // potential todo: rename 'gravatar-img' class in the CSS to be something
            // that both the gravatar and the image preview can use that's not so confusing
            this.$('.js-img-preview').empty().append(this.$(file.preview).addClass('gravatar-img'));
        }
    }
});
