/*global jQuery, Ghost, document, Image, window */
(function ($) {
    "use strict";

    var UploadUi,
        $progress =  $('<div />', {
            "class" : "js-upload-progress progress progress-success active",
            "style": "opacity:0",
            "role": "progressbar",
            "aria-valuemin": "0",
            "aria-valuemax": "100"
        }).append($("<div />", {
            "class": "js-upload-progress-bar bar",
            "style": "width:0%"
        }));

    UploadUi = function ($dropzone, settings) {
        var source,
            $link = $('<a class="js-edit-image image-edit" href="#" >' +
                '<img src="/public/assets/img/add-image.png" width="16" height="16" alt="add, edit"></a>'),
            $back = $('<a class="js-return-image image-edit" href="#" >' +
                '<img src="/public/assets/img/return-image.png" width="16" height="16" alt="add, edit"></a>');

        $.extend(this, {
            bindFileUpload: function () {
                var self = this;

                $dropzone.find('.js-fileupload').fileupload().fileupload("option", {
                    url: '/ghost/upload',
                    add: function (e, data) {
                        $progress.find('.js-upload-progress-bar').removeClass('fail');
                        $dropzone.trigger('uploadstart');
                        $dropzone.find('a.js-return-image').remove();
                        $dropzone.find('span.media, div.description, a.image-url, a.image-webcam, div.js-fail, button.js-fail')
                            .animate({opacity: 0}, 250, function () {
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

                    done: function (e, data) {
                        function showImage(width, height) {
                            $dropzone.find('img.js-upload-target').attr({"width": width, "height": height}).css({"display": "block"});
                            $dropzone.find('.fileupload-loading').removeClass('fileupload-loading');
                            $dropzone.css({"height": "auto"});
                            if (!$dropzone.find('a.js-edit-image')[0]) {
                                $link.css({"opacity": 100});
                                $dropzone.find('.js-upload-target').after($link);
                            }
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

                        function failedImageUpload() {
                            $progress.find('.js-upload-progress-bar').addClass('fail');
                            $dropzone.find('div.js-fail').animate({"opacity": 100}, 1500);
                            $dropzone.find('button.js-fail').animate({"opacity": 100}, 1500).on('click', function () {
                                $dropzone.css({minHeight: 0});
                                if (source !== undefined && !$dropzone.find('a.js-return-image')[0]) {
                                    console.log("source:", source);
                                    $back.css({"opacity": 100});
                                    $dropzone.find('.js-upload-target').after($back);
                                }
                                self.removeExtras();
                                self.init();
                            });
                        }

                        function preLoadImage() {
                            var $img = $dropzone.find('img.js-upload-target')
                                .attr({'src': '', "width": 'auto', "height": 'auto'});
                            if (data.result === "Invalid filetype") {
                                $dropzone.trigger("uploadfailed", [data.result]);
                                failedImageUpload();
                            } else {
                                $progress.animate({opacity: 0}, 250, function () {
                                    $dropzone.find('span.media').after('<img class="fileupload-loading"  src="/public/img/loadingcat.gif" />');
                                    if (!settings.editor) {$progress.find('.fileupload-loading').css({"top": "56px"}); }
                                });
                                $dropzone.trigger("uploadsuccess", [data.result]);
                                $img.one('load', function () { animateDropzone($img); })
                                    .attr('src', data.result);
                            }
                        }
                        preLoadImage();
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
                    $dropzone.append('<div class="js-fail failed" style="opacity: 0">Something went wrong :(</div>');
                }
                if (!$dropzone.find('button.js-fail')[0]) {
                    $dropzone.append('<button class="js-fail button-add" style="opacity: 0">Try Again</button>');
                }
                if (!$dropzone.find('a.image-url')[0]) {
                    $dropzone.append('<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>');
                }
                if (!$dropzone.find('a.image-webcam')[0]) {
                    $dropzone.append('<a class="image-webcam" title="Add image from webcam"><span class="hidden">Webcam</span></a>');
                }
            },

            removeExtras: function () {
                $dropzone.find('div.description, span.media, div.js-upload-progress, a.image-url, a.image-webcam, div.js-fail, button.js-fail')
                    .remove();
            },

            initWithDropzone: function () {
                var self = this;
                //This is the start point if no image exists
                $dropzone.find('img.js-upload-target').css({"display": "none"});
                $dropzone.removeClass('pre-image-uploader').addClass('image-uploader');

                this.buildExtras();

                $dropzone.find('a.js-edit-image').remove();

                $back.on('click', function () {
                    $dropzone.find('a.js-return-image').remove();
                    $dropzone.find('img.js-upload-target').attr({"src": source}).css({"display": "block"});
                    self.removeExtras();
                    $dropzone.removeClass('image-uploader').addClass('pre-image-uploader');
                    self.init();
                });
                this.bindFileUpload();
            },

            initWithImage: function () {
                var self = this;
                // This is the start point if an image already exists
                source = $dropzone.find('img.js-upload-target').attr('src');
                $dropzone.removeClass('image-uploader').addClass('pre-image-uploader');

                if (!$dropzone.find('a.js-edit-image')[0]) {
                    $link.css({"opacity": 100});
                    $dropzone.find('.js-upload-target').after($link);
                }

                $link.on('click', function () {
                    $dropzone.find('a.js-edit-image').remove();
                    $dropzone.find('img.js-upload-target').attr({"src": ""}).css({"display": "none"});
                    $back.css({"cursor": "pointer", "z-index": 9999, "opacity": 100});
                    $dropzone.find('.js-upload-target').after($back);
                    self.init();
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