/*global jQuery, Ghost, document, Image, window */
(function ($) {
    "use strict";

    var UploadUi,
        $loader = '<span class="media"><span class="hidden">Image Upload</span></span>' +
            '<div class="description">Add image</div>' +
            '<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>' +
            '<a class="image-webcam" title="Add image from webcam">' +
            '<span class="hidden">Webcam</span></a>',
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
                '<img src="/public/assets/img/addImage.png" width="16" height="16" alt="add, edit"></a>'),
            $back = $('<a class="js-return-image image-edit" href="#" >' +
                '<img src="/public/assets/img/returnImage.png" width="16" height="16" alt="add, edit"></a>');

        $.extend(this, {
            bindFileUpload: function () {
                var self = this;

                $dropzone.find('.js-fileupload').fileupload().fileupload("option", {
                    url: '/ghost/upload',
                    add: function (e, data) {
                        $dropzone.find('a.js-return-image').remove();
                        $dropzone.find('span.media, div.description, a.image-url, a.image-webcam')
                            .animate({opacity: 0}, 250, function () {
                                if (settings.progressbar) {
                                    $dropzone.find('span.media').after($progress);
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
                            $progress.find('.js-upload-progress-bar').css('width', progress + '%');
                            if (data.loaded / data.total === 1) {
                                $progress.animate({opacity: 0}, 250, function () {
                                    $dropzone.find('span.media').after('<img class="fileupload-loading"  src="/public/img/loadingcat.gif" />');
                                    if (!settings.editor) {$progress.find('.fileupload-loading').css({"top": "56px"}); }
                                });
                            }
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

                        function preloadImage() {
                            var $img = $dropzone.find('img.js-upload-target')
                                .attr({'src': '', "width": 'auto', "height": 'auto'});
                            $img.one('load', function () { animateDropzone($img); })
                                .attr('src', data.result);
                        }
                        preloadImage();
                    }
                });
            },

            removeExtras: function () {
                $dropzone.find('div.description, span.media, div.js-upload-progress, a.image-url, a.image-webcam')
                    .remove();
            },

            initWithDropzone: function () {
                var self = this;
                //This is the start point if no image exists
                $dropzone.find('img.js-upload-target').css({"display": "none"});
                $dropzone.removeClass('pre-image-uploader').addClass('image-uploader');
                if (!$dropzone.find('span.media')[0]) {
                    $dropzone.append($loader);
                }
                if ($dropzone.find('a.js-edit-image')[0]) {
                    $dropzone.find('a.js-edit-image').remove();
                }

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
                var img;
                // First check if field image is defined by checking for js-upload-target class
                if ($dropzone.find('img.js-upload-target')[0]) {
                    if ($dropzone.find('img.js-upload-target').attr('src') === '') {
                        this.initWithDropzone();
                    } else {
                        this.initWithImage();
                    }
                } else {
                    // This ensures there is an image we can hook into to display uploaded image
                    $dropzone.prepend('<img class="js-upload-target" style="display: none"  src="" />');
                    this.init();
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