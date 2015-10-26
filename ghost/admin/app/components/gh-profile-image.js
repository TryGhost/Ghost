/* global md5 */
import Ember from 'ember';

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
export default Ember.Component.extend({
    email: '',
    size: 90,
    debounce: 300,

    validEmail: '',
    hasUploadedImage: false,
    fileStorage: true,

    ghostPaths: Ember.inject.service('ghost-paths'),
    displayGravatar: Ember.computed.notEmpty('validEmail'),

    defaultImage: Ember.computed('ghostPaths', function () {
        const url = this.get('ghostPaths.url').asset('/shared/img/user-image.png');
        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    trySetValidEmail: function () {
        if (!this.get('isDestroyed')) {
            const email = this.get('email');
            this.set('validEmail', validator.isEmail(email) ? email : '');
        }
    },

    didReceiveAttrs: function (attrs) {
        const timeout = parseInt(attrs.newAttrs.throttle || this.get('debounce'));
        Ember.run.debounce(this, 'trySetValidEmail', timeout);
    },

    imageBackground: Ember.computed('validEmail', 'size', function () {
        const email = this.get('validEmail'),
              size = this.get('size');

        if (email) {
            let url = `http://www.gravatar.com/avatar/${md5(email)}?s=${size}&d=blank`;
            return Ember.String.htmlSafe(`background-image: url(${url})`);
        }
    }),

    didInsertElement: function () {
        var size = this.get('size'),
            uploadElement = this.$('.js-file-input');

        // Fire this immediately in case we're initialized with a valid email
        this.trySetValidEmail();

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
        .on('fileuploadadd', Ember.run.bind(this, this.queueFile))
        .on('fileuploadprocessalways', Ember.run.bind(this, this.triggerPreview));
    },

    willDestroyElement: function () {
        if (this.$('.js-file-input').data()['blueimp-fileupload']) {
            this.$('.js-file-input').fileupload('destroy');
        }
    },

    queueFile: function (e, data) {
        const fileName = data.files[0].name;

        if ((/\.(gif|jpe?g|png|svg?z)$/i).test(fileName)) {
            this.sendAction('setImage', data);
        }
    },

    triggerPreview: function (e, data) {
        const file = data.files[data.index];
        if (file.preview) {
            this.set('hasUploadedImage', true);
            // necessary jQuery code because file.preview is a raw DOM object
            // potential todo: rename 'gravatar-img' class in the CSS to be something
            // that both the gravatar and the image preview can use that's not so confusing
            this.$('.js-img-preview').empty().append(this.$(file.preview).addClass('gravatar-img'));
        }
    }
});
