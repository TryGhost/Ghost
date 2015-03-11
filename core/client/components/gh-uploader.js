import ghostPaths from 'ghost/utils/ghost-paths';

var ImageUploader = Ember.Component.extend({

    cancelMode: false,
    cancelUrl: Ember.computed('cancelMode', function () {
        return (this.get('cancelMode') === 'url' && this.get('fileStorage'));
    }),
    editor: true,
    enableExtras: true,
    fileStorage: Ember.computed(function () {
        return this.get('config.fileStorage');
    }),
    loading: false,
    loadingCat: Ember.computed(function () {
        return ghostPaths().subdir + '/ghost/img/loadingcat.gif';
    }),
    rightClass: false,
    saveButtonDisabled: false,
    showImage: true,
    uploaderClass: 'image-uploader',
    urlUi: false,
    imageUploadButton: false,

    $dropzone: null,

    // Image
    imgWidth: 'auto',
    imgHeight: 'auto',
    imgStyle: Ember.computed('imgWidth', 'imgHeight', function () {
        return 'width: ' + this.get('imgWidth') + '; height: ' + this.get('imgHeight') + '; display: block;';
    }),

    // Progressbar
    progressbar: false,
    progress: 0,
    progressBarStyle: Ember.computed('progress', function () {
        return 'width: ' + this.get('progress') + '%';
    }),

    uploadFolder: Ember.computed(function () {
        return ghostPaths().apiRoot + '/uploads/';
    }),

    // Fail Messages
    errorMaxSize: 'The image you uploaded was larger than the maximum file size your server allows.',
    errorFileType: 'The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.',
    errorGeneric: 'Something went wrong :(',
    errorText: '',
    error: Ember.computed('errorText', function () {
        return (this.get('errorText') && this.get('errorText') !== '');
    }),

    // Reset Observer
    imageChanged: Ember.observer('image', function () {
        Ember.run.once(this, 'reset');
    }),

    reset: function () {
        var image = this.get('image');

        if (!image || image === '') {
            this.send('initWithDropzone');
        } else if (!this.get('progressbar') && image) {
            this.send('initWithImage');
        }
    },

    // This binds a jQuery Fileupload to the component. It is called during component setup.
    _bindFileUpload: function () {
        var self = this,
            $dropzone = this.$();

        this.set('$dropzone', $dropzone);

        this.$().fileupload().fileupload('option', {
            url: this.get('uploadFolder'),
            dropZone: this.get('fileStorage') ? $dropzone : null,

            add: function (event, data) {
                self.set('saveButtonDisabled', true);
                self.set('rightClass', false);
                self.set('urlUi', false);

                $dropzone.trigger('uploadstart', [$dropzone.attr('id')]);
                $dropzone.find('span.media, div.description, a.image-url, a.image-webcam')
                    .animate({opacity: 0}, 250, function () {
                        self.set('progressbar', true);
                        $dropzone.find('div.description').hide().css({opacity: 100});
                        $('div.js-upload-progress').animate({opacity: 100}, 250);

                        data.submit();
                    });

                self.sendAction('uploadstarted', event, data);
            },

            progressall: function (event, data) {
                var progress = parseInt(data.loaded / data.total * 100, 10);
                self.set('progress', progress);

                if (self._actions && self._actions.uploadprogress) {
                    self.sendAction('uploadprogress', event, [progress, data]);
                }
            },

            fail: function (event, data) {
                self.set('saveButtonDisabled', false);
                self.sendAction('uploadfailure', event, data.result);

                if (data.jqXHR.status === 413) {
                    self.set('errorText', self.get('errorMaxSize'));
                } else if (data.jqXHR.status === 415) {
                    self.set('errorText', self.get('errorFileType'));
                } else {
                    self.set('errorText', self.get('errorGeneric'));
                }

                $dropzone.find('div.js-fail, button.js-fail').fadeIn(1500);
                $dropzone.find('button.js-fail').on('click', function () {
                    $dropzone.css({minHeight: 0});
                    $dropzone.find('div.description').show();
                    self.set('enableExtras', false);
                    self.init();
                });
            },

            done: function (event, data) {
                self.send('complete', event, data.result);
            }
        });

        this.send('init');
    },

    setup: function () {
        var $this = this.$(),
            self = this;

        $this.on('uploadsuccess', function (event, result) {
            if (result && result !== '' && result !== 'http://') {
                self.sendAction('uploaded', result);
            }
        });

        $this.on('imagecleared', function () {
            self.sendAction('canceled');
        });

        this._bindFileUpload();
    }.on('didInsertElement'),

    removeListeners: function () {
        this.get('$dropzone').off();
    }.on('willDestroyElement'),

    actions: {
        init: function () {
            this.set('saveButtonDisabled', false);

            if (!this.get('image') || this.get('image') === '') {
                this.send('initWithDropzone');
            } else {
                this.send('initWithImage');
            }
        },

        initWithDropzone: function () {
            var $dropzone = this.get('$dropzone');

            this.set('showImage', false);
            this.set('cancelMode', false);
            this.set('enableExtras', true);
            this.set('rightClass', false);
            this.set('urlUi', false);
            this.set('progressbar', false);
            this.set('uploaderClass', 'image-uploader');

            $dropzone.find('div.description').show();

            if (!this.get('fileStorage')) {
                this.send('initUrl');
            }
        },

        initUrl: function () {
            this.set('enableExtras', false);
            this.set('uploaderClass', 'image-uploader image-uploader-url');
            this.set('rightClass', true);
            this.set('cancelMode', 'url');
            this.set('urlUi', true);
            this.set('cancelMode', 'url');
        },

        initWithImage: function () {
            var $dropzone = this.get('$dropzone');

            this.set('uploaderClass', 'pre-image-uploader');
            this.set('cancelMode', 'image');
            this.set('showImage', true);
            $dropzone.css({height: 'auto'});
            $dropzone.find('div.description').hide();
            $dropzone.find('img.js-upload-target').show();
        },

        cancel: function () {
            var $dropzone = this.get('$dropzone');

            this.set('uploaderClass', 'image-uploader');

            switch (this.get('cancelMode')) {
                case 'url':
                    $dropzone.find('div.description').show();
                    break;
                case 'image':
                    this.set('progressbar', false);
                    this.set('rightClass', true);
                    this.set('enableExtras', false);
                    break;
                default:
                    break;
            }

            $dropzone.trigger('imagecleared');
            this.set('image', '');
        },

        confirmUrl: function () {
            var $dropzone = this.get('$dropzone'),
                imageUrl = this.get('imageUrl');

            if (imageUrl === '') {
                $dropzone.trigger('uploadsuccess', 'http://');
                this.send('initWithDropzone');
            } else {
                this.send('complete', null, imageUrl);
            }
        },

        complete: function (event, result) {
            var self = this,
                $dropzone = this.get('$dropzone'),
                $progress = this.$('.progress'),
                showImage, animateDropzone, preLoadImage;

            showImage = function () {
                self.set('loading', false);
                self.set('showImage', true);

                $dropzone.find('div.description').hide();
                $dropzone.css({height: 'auto'});
                $dropzone.delay(250).animate({opacity: 100}, 1000, function () {
                    self.set('saveButtonDisabled', false);
                    self.send('init');
                });
            };

            animateDropzone = function ($img) {
                $dropzone.animate({opacity: 0}, 250, function () {
                    self.set('uploaderClass', 'pre-image-uploader');
                    self.set('enableExtras', false);
                    self.set('urlUi', false);

                    $dropzone.css({minHeight: 0});
                    $dropzone.animate({height: $img.height()}, 250, function () {
                        showImage();
                    });
                });
            };

            preLoadImage = function () {
                var $img = $dropzone.find('img.js-upload-target');

                self.set('showImage', false);

                $img.one('load', function () {
                    animateDropzone($img);
                });
                $progress.animate({opacity: 0}, 250, function () {
                    self.set('loading', true);
                    self.set('image', result);
                });
                $dropzone.trigger('uploadsuccess', [result]);
            };

            preLoadImage();
        }
    }

});

export default ImageUploader;
