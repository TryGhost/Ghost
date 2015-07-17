/* global md5 */
import Ember from 'ember';

/**
 * A component to manage a user profile image. By default it just handles picture uploads,
 * but if passed a bound 'email' property it will render the user's gravatar image
 *
 * Example: {{gh-profile-image email=controllerEmailProperty setImage="controllerActionName"}}
 *
 * @param  {int}     size              The size of the image to render
 * @param  {String}  email             Reference to a bound email object if gravatar image behavior is desired.
 * @param  {String}  setImage          The string name of the action on the controller to be called when an image is added.
 * @property  {Boolean} hasUploadedImage  Whether or not the user has uploaded an image (whether or not to show the default image/gravatar image)
 * @property  {String}  defaultImage      String containing the background-image css property of the default user profile image
 * @property  {String}  imageBackground   String containing the background-image css property with the gravatar url
 */
export default Ember.Component.extend({
    email: '',
    size: 90,
    hasUploadedImage: false,
    fileStorage: true,

    ghostPaths: Ember.inject.service('ghost-paths'),
    hasEmail: Ember.computed.notEmpty('email'),

    defaultImage: Ember.computed('ghostPaths', function () {
        var url = this.get('ghostPaths.url').asset('/shared/img/user-image.png');
        return `background-image: url(${url})`.htmlSafe();
    }),

    imageBackground: Ember.computed('email', 'size', function () {
        var email = this.get('email'),
            size = this.get('size'),
            url;
        if (email) {
            url = 'http://www.gravatar.com/avatar/' + md5(email) + '?s=' + size + '&d=blank';
            return `background-image: url(${url})`.htmlSafe();
        }
    }),

    didInsertElement: function () {
        var size = this.get('size'),
            uploadElement = this.$('.js-file-input');

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
        this.$('.js-file-input').fileupload('destroy');
    },

    queueFile: function (e, data) {
        var fileName = data.files[0].name;

        if ((/\.(gif|jpe?g|png|svg?z)$/i).test(fileName)) {
            this.sendAction('setImage', data);
        }
    },

    triggerPreview: function (e, data) {
        var file = data.files[data.index];
        if (file.preview) {
            this.set('hasUploadedImage', true);
            // necessary jQuery code because file.preview is a raw DOM object
            // potential todo: rename 'gravatar-img' class in the CSS to be something
            // that both the gravatar and the image preview can use that's not so confusing
            this.$('.js-img-preview').empty().append(this.$(file.preview).addClass('gravatar-img'));
        }
    }
});
