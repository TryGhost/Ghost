import $ from 'jquery';
import Component from '@ember/component';
import request from 'ember-ajax/request';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';
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
    config: service(),
    ghostPaths: service(),

    email: '',
    size: 180,
    debounce: 300,

    imageFile: null,
    hasUploadedImage: false,

    _defaultImageUrl: '',

    // closure actions
    setImage() {},

    placeholderStyle: htmlSafe('background-image: url()'),
    avatarStyle: htmlSafe('display: none'),

    init() {
        this._super(...arguments);

        this._defaultImageUrl = `${this.get('ghostPaths.assetRoot')}img/user-image.png`;
        this._setPlaceholderImage(this._defaultImageUrl);
    },

    didReceiveAttrs() {
        this._super(...arguments);

        if (this.get('config.useGravatar')) {
            this.get('setGravatar').perform();
        }
    },

    actions: {
        imageSelected(fileList, resetInput) {
            // eslint-disable-next-line
            let imageFile = fileList[0];

            if (imageFile) {
                let reader = new FileReader();

                this.set('imageFile', imageFile);
                this.setImage(imageFile);

                reader.addEventListener('load', () => {
                    let dataURL = reader.result;
                    this.set('previewDataURL', dataURL);
                }, false);

                reader.readAsDataURL(imageFile);
            }

            resetInput();
        },

        openFileDialog(event) {
            // simulate click to open file dialog
            // using jQuery because IE11 doesn't support MouseEvent
            $(event.target)
                .closest('figure')
                .find('input[type="file"]')
                .click();
        }
    },

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
    },

    dragLeave(event) {
        event.preventDefault();
    },

    drop(event) {
        event.preventDefault();

        if (event.dataTransfer.files) {
            this.send('imageSelected', event.dataTransfer.files);
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

    queueFile(e, data) {
        let fileName = data.files[0].name;

        if ((/\.(gif|jpe?g|png|svg?z)$/i).test(fileName)) {
            let action = this.get('setImage');
            if (action) {
                action(data);
            }
        }
    }
});
