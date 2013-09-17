/*global jQuery, Ghost, document, Image, window */
(function ($) {
    "use strict";

    var UploadUi;


    UploadUi = function ($dropzone, settings) {
        var source,
            $url = '<div class="js-url"><input id="uploadurl" class="url" type="url" placeholder="http://"/></div>',
            $cancel = '<a class="image-cancel js-cancel"><span class="hidden">Delete</span></a>',
            $progress =  $('<div />', {
                "class" : "js-upload-progress progress progress-success active",
                "role": "progressbar",
                "aria-valuemin": "0",
                "aria-valuemax": "100"
            }).append($("<div />", {
                "class": "js-upload-progress-bar bar",
                "style": "width:0%"
            }));

        $.extend(this, {
            complete: function (result) {
                var self = this;

                $dropzone.trigger("uploadsuccess", [result, $dropzone.attr('id')]);

                function showImage(width, height) {
                    $dropzone.find('img.js-upload-target').attr({"width": width, "height": height}).css({"display": "block"});
                    $dropzone.find('.fileupload-loading').remove();
                    $dropzone.css({"height": "auto"});
                    $dropzone.delay(250).animate({opacity: 100}, 1000, function () {
                        self.init();
                    });
                }

                function animateDropzone($img) {
                    $dropzone.animate({opacity: 0}, 250, function () {
                        $dropzone.removeClass('image-uploader').addClass('pre-image-uploader');
                        $dropzone.css({minHeight: 0});
                        self.removeExtras();
                        $dropzone.animate({height: $img.height()}, 250, function () {
                            showImage($img.width(), $img.height());
                        });
                    });
                }

                function preLoadImage() {
                    var $img = $dropzone.find('img.js-upload-target')
                        .attr({'src': '', "width": 'auto', "height": 'auto'});

                    $progress.animate({"opacity": 0}, 250, function () {
                        $dropzone.find('span.media').after('<img class="fileupload-loading"  src="/ghost/img/loadingcat.gif" />');
                        if (!settings.editor) {$progress.find('.fileupload-loading').css({"top": "56px"}); }
                    });
                    $dropzone.trigger("uploadsuccess", [result]);
                    $img.one('load', function () {
                        animateDropzone($img);
                    }).attr('src', result);
                }
                preLoadImage();

            },

            bindFileUpload: function () {
                var self = this;

                $dropzone.find('.js-fileupload').fileupload().fileupload("option", {
                    url: '/ghost/upload/',
                    add: function (e, data) {
                        $dropzone.find('.js-fileupload').removeClass('right');
                        $dropzone.find('.js-url, button.centre').remove();
                        $progress.find('.js-upload-progress-bar').removeClass('fail');
                        $dropzone.trigger('uploadstart', [$dropzone.attr('id')]);
                        $dropzone.find('span.media, div.description, a.image-url, a.image-webcam')
                            .animate({opacity: 0}, 250, function () {
                                $dropzone.find('div.description').hide().css({"opacity": 100});
                                if (settings.progressbar) {
                                    $dropzone.find('div.js-fail').after($progress);
                                    $progress.animate({opacity: 100}, 250);
                                }
                                data.submit();
                            });
                    },
                    dropZone: $dropzone,
                    progressall: function (e, data) {
                        var progress = parseInt(data.loaded / data.total * 100, 10);
                        if (!settings.editor) {$progress.find('div.js-progress').css({"position": "absolute", "top": "40px"}); }
                        if (settings.progressbar) {
                            $dropzone.trigger("uploadprogress", [progress, data]);
                            $progress.find('.js-upload-progress-bar').css('width', progress + '%');
                        }
                    },
                    fail: function (e, data) {
                        $dropzone.trigger("uploadfailure", [data.result]);
                        $dropzone.find('.js-upload-progress-bar').addClass('fail');
                        $dropzone.find('div.js-fail, button.js-fail').fadeIn(1500);
                        $dropzone.find('button.js-fail').on('click', function () {
                            $dropzone.css({minHeight: 0});
                            $dropzone.find('div.description').show();
                            self.removeExtras();
                            self.init();
                        });
                    },
                    done: function (e, data) {
                        self.complete(data.result);
                    }
                });
            },

            buildExtras: function () {
                if (!$dropzone.find('span.media')[0]) {
                    $dropzone.prepend('<span class="media"><span class="hidden">Image Upload</span></span>');
                }
                if (!$dropzone.find('div.description')[0]) {
                    $dropzone.append('<div class="description">Add image</div>');
                }
                if (!$dropzone.find('div.js-fail')[0]) {
                    $dropzone.append('<div class="js-fail failed" style="display: none">Something went wrong :(</div>');
                }
                if (!$dropzone.find('button.js-fail')[0]) {
                    $dropzone.append('<button class="js-fail button-add" style="display: none">Try Again</button>');
                }
                if (!$dropzone.find('a.image-url')[0]) {
                    $dropzone.append('<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>');
                }
//                if (!$dropzone.find('a.image-webcam')[0]) {
//                    $dropzone.append('<a class="image-webcam" title="Add image from webcam"><span class="hidden">Webcam</span></a>');
//                }
            },

            removeExtras: function () {
                $dropzone.find('span.media, div.js-upload-progress, a.image-url, a.image-webcam, div.js-fail, button.js-fail, a.js-cancel').remove();
            },

            initWithDropzone: function () {
                var self = this;
                //This is the start point if no image exists
                $dropzone.find('img.js-upload-target').css({"display": "none"});
                $dropzone.removeClass('pre-image-uploader').addClass('image-uploader');
                this.removeExtras();
                this.buildExtras();
                this.bindFileUpload();
                $dropzone.find('a.image-url').on('click', function () {
                    self.initUrl();
                });
            },
            initUrl: function () {
                var self = this, val;
                this.removeExtras();
                $dropzone.find('.js-fileupload').addClass('right');
                $dropzone.append($cancel);
                $dropzone.find('.js-cancel').on('click', function () {
                    $dropzone.find('.js-url').remove();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    $dropzone.find('button.centre').remove();
                    self.removeExtras();
                    self.initWithDropzone();
                });
                if (settings.editor) {
                    $dropzone.find('div.description').after('<button class="js-button-accept button-save centre">Save</button>');
                }
                $dropzone.find('div.description').before($url);

                $dropzone.find('.js-button-accept').on('click', function () {
                    $dropzone.find('div.description').hide();
                    val = $('#uploadurl').val();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    $dropzone.find('.js-url').remove();
                    $dropzone.find('button.centre').remove();
                    self.complete(val);
                });
            },
            initWithImage: function () {
                var self = this;
                // This is the start point if an image already exists
                source = $dropzone.find('img.js-upload-target').attr('src');
                $dropzone.removeClass('image-uploader').addClass('pre-image-uploader');
                $dropzone.find('div.description').hide();
                $dropzone.append($cancel);
                $dropzone.find('.js-cancel').on('click', function () {
                    $dropzone.find('img.js-upload-target').attr({'src': ''});
                    $dropzone.find('div.description').show();
                    self.initWithDropzone();
                });
            },

            init: function () {
                // First check if field image is defined by checking for js-upload-target class
                if (!$dropzone.find('img.js-upload-target')[0]) {
                    // This ensures there is an image we can hook into to display uploaded image
                    $dropzone.prepend('<img class="js-upload-target" style="display: none"  src="" />');
                }

                if ($dropzone.find('img.js-upload-target').attr('src') === '') {
                    this.initWithDropzone();
                } else {
                    this.initWithImage();
                }
            }
        });
    };


    $.fn.upload = function (options) {
        var settings = $.extend({
            progressbar: true,
            editor: false
        }, options);

        return this.each(function () {
            var $dropzone = $(this),
                ui;

            ui = new UploadUi($dropzone, settings);
            ui.init();
        });
    };
}(jQuery));