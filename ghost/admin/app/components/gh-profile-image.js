import Component from 'ember-component';
import injectService from 'ember-service/inject';
import request from 'ember-ajax/request';
import run from 'ember-runloop';
import {htmlSafe} from 'ember-string';
import {task, timeout} from 'ember-concurrency';

const ANIMATION_TIMEOUT = 1000;

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
    size: 180,
    debounce: 300,

    hasUploadedImage: false,

    config: injectService(),
    ghostPaths: injectService(),

    placeholderStyle: htmlSafe('background-image: url()'),
    avatarStyle: htmlSafe('display: none'),

    _defaultImageUrl: '',

    init() {
        this._super(...arguments);

        this._defaultImageUrl = `${this.get('ghostPaths.assetRoot')}img/user-image.png`;
        this._setPlaceholderImage(this._defaultImageUrl);
    },

    didInsertElement() {
        this._super(...arguments);

        let size = this.get('size');
        let uploadElement = this.$('.js-file-input');

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

    didReceiveAttrs() {
        this._super(...arguments);

        if (this.get('config.useGravatar')) {
            this.get('setGravatar').perform();
        }
    },

    setGravatar: task(function* () {
        yield timeout(this.get('debounce'));

        let email = this.get('email');

        if (validator.isEmail(email)) {
            let size = this.get('size');
            let gravatarUrl = `//www.gravatar.com/avatar/${window.md5(email)}?s=${size}&d=404`;

            try {
                // HEAD request is needed otherwise jquery attempts to process
                // binary data as JSON and throws an error
                yield request(gravatarUrl, {type: 'HEAD'});
                // gravatar exists so switch style and let browser load it
                this._setAvatarImage(gravatarUrl);
                // wait for fade-in animation to finish before removing placeholder
                yield timeout(ANIMATION_TIMEOUT);
                this._setPlaceholderImage('');

            } catch (e) {
                // gravatar doesn't exist so make sure we're still showing the placeholder
                this._setPlaceholderImage(this._defaultImageUrl);
                // then make sure the avatar isn't visible
                this._setAvatarImage('');
            }
        }
    }).restartable(),

    _setPlaceholderImage(url) {
        this.set('placeholderStyle', htmlSafe(`background-image: url(${url});`));
    },

    _setAvatarImage(url) {
        let display = url ? 'block' : 'none';
        this.set('avatarStyle', htmlSafe(`background-image: url(${url}); display: ${display}`));
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
