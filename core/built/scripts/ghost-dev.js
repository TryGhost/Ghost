define("ghost/adapters/application", 
  ["ghost/adapters/embedded-relation-adapter","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EmbeddedRelationAdapter = __dependency1__["default"];

    var ApplicationAdapter = EmbeddedRelationAdapter.extend();

    __exports__["default"] = ApplicationAdapter;
  });
define("ghost/adapters/base", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var BaseAdapter = DS.RESTAdapter.extend({
        host: window.location.origin,
        namespace: ghostPaths().apiRoot.slice(1),

        findQuery: function (store, type, query) {
            var id;

            if (query.id) {
                id = query.id;
                delete query.id;
            }

            return this.ajax(this.buildURL(type.typeKey, id), 'GET', {data: query});
        },

        buildURL: function (type, id) {
            // Ensure trailing slashes
            var url = this._super(type, id);

            if (url.slice(-1) !== '/') {
                url += '/';
            }

            return url;
        },

        // Override deleteRecord to disregard the response body on 2xx responses.
        // This is currently needed because the API is returning status 200 along
        // with the JSON object for the deleted entity and Ember expects an empty
        // response body for successful DELETEs.
        // Non-2xx (failure) responses will still work correctly as Ember will turn
        // them into rejected promises.
        deleteRecord: function () {
            var response = this._super.apply(this, arguments);

            return response.then(function () {
                return null;
            });
        }
    });

    __exports__["default"] = BaseAdapter;
  });
define("ghost/adapters/embedded-relation-adapter", 
  ["ghost/adapters/base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseAdapter = __dependency1__["default"];

    // EmbeddedRelationAdapter will augment the query object in calls made to
    // DS.Store#find, findQuery, and findAll with the correct "includes"
    // (?include=relatedType) by introspecting on the provided subclass of the DS.Model.
    // In cases where there is no query object (DS.Model#save, or simple finds) the URL
    // that is built will be augmented with ?include=... where appropriate.
    //
    // Example:
    // If a model has an embedded hasMany relation, the related type will be included:
    // roles: DS.hasMany('role', { embedded: 'always' }) => ?include=roles

    var EmbeddedRelationAdapter = BaseAdapter.extend({
        find: function (store, type, id) {
            return this.ajax(this.buildIncludeURL(store, type, id), 'GET');
        },

        findQuery: function (store, type, query) {
            return this._super(store, type, this.buildQuery(store, type, query));
        },

        findAll: function (store, type, sinceToken) {
            var query = {};

            if (sinceToken) {
                query.since = sinceToken;
            }

            return this.findQuery(store, type, query);
        },

        createRecord: function (store, type, record) {
            return this.saveRecord(store, type, record, {method: 'POST'});
        },

        updateRecord: function (store, type, record) {
            var options = {
                method: 'PUT',
                id: Ember.get(record, 'id')
            };

            return this.saveRecord(store, type, record, options);
        },

        saveRecord: function (store, type, record, options) {
            options = options || {};

            var url = this.buildIncludeURL(store, type, options.id),
                payload = this.preparePayload(store, type, record);

            return this.ajax(url, options.method, payload);
        },

        preparePayload: function (store, type, record) {
            var serializer = store.serializerFor(type.typeKey),
                payload = {};

            serializer.serializeIntoHash(payload, type, record);

            return {data: payload};
        },

        buildIncludeURL: function (store, type, id) {
            var url = this.buildURL(type.typeKey, id),
                includes = this.getEmbeddedRelations(store, type);

            if (includes.length) {
                url += '?include=' + includes.join(',');
            }

            return url;
        },

        buildQuery: function (store, type, options) {
            var toInclude = this.getEmbeddedRelations(store, type),
                query = options || {},
                deDupe = {};

            if (toInclude.length) {
                // If this is a find by id, build a query object and attach the includes
                if (typeof options === 'string' || typeof options === 'number') {
                    query = {};
                    query.id = options;
                    query.include = toInclude.join(',');
                } else if (typeof options === 'object' || Ember.isNone(options)) {
                    // If this is a find all (no existing query object) build one and attach
                    // the includes.
                    // If this is a find with an existing query object then merge the includes
                    // into the existing object. Existing properties and includes are preserved.
                    query = query || {};
                    toInclude = toInclude.concat(query.include ? query.include.split(',') : []);

                    toInclude.forEach(function (include) {
                        deDupe[include] = true;
                    });

                    query.include = Object.keys(deDupe).join(',');
                }
            }

            return query;
        },

        getEmbeddedRelations: function (store, type) {
            var model = store.modelFor(type),
                ret = [];

            // Iterate through the model's relationships and build a list
            // of those that need to be pulled in via "include" from the API
            model.eachRelationship(function (name, meta) {
                if (meta.kind === 'hasMany' &&
                    Object.prototype.hasOwnProperty.call(meta.options, 'embedded') &&
                    meta.options.embedded === 'always') {
                    ret.push(name);
                }
            });

            return ret;
        }
    });

    __exports__["default"] = EmbeddedRelationAdapter;
  });
define("ghost/adapters/setting", 
  ["ghost/adapters/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationAdapter = __dependency1__["default"];

    var SettingAdapter = ApplicationAdapter.extend({
        updateRecord: function (store, type, record) {
            var data = {},
                serializer = store.serializerFor(type.typeKey);

            // remove the fake id that we added onto the model.
            delete record.id;

            // use the SettingSerializer to transform the model back into
            // an array of settings objects like the API expects
            serializer.serializeIntoHash(data, type, record);

            // use the ApplicationAdapter's buildURL method but do not
            // pass in an id.
            return this.ajax(this.buildURL(type.typeKey), 'PUT', {data: data});
        }
    });

    __exports__["default"] = SettingAdapter;
  });
define("ghost/adapters/user", 
  ["ghost/adapters/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationAdapter = __dependency1__["default"];

    var UserAdapter = ApplicationAdapter.extend({
        find: function (store, type, id) {
            return this.findQuery(store, type, {id: id, status: 'all'});
        }
    });

    __exports__["default"] = UserAdapter;
  });
define("ghost/app", 
  ["ember/resolver","ember/load-initializers","ghost/utils/link-view","ghost/utils/text-field","ghost/config","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Resolver = __dependency1__["default"];
    var loadInitializers = __dependency2__["default"];
    var configureApp = __dependency5__["default"];

    Ember.MODEL_FACTORY_INJECTIONS = true;

    var App = Ember.Application.extend({
        modulePrefix: 'ghost',
        Resolver: Resolver['default']
    });

    // Runtime configuration of Ember.Application
    configureApp(App);

    loadInitializers(App, 'ghost');

    __exports__["default"] = App;
  });
define("ghost/assets/lib/touch-editor", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var createTouchEditor = function createTouchEditor() {
        var noop = function () {},
            TouchEditor;

        TouchEditor = function (el, options) {
            /*jshint unused:false*/
            this.textarea = el;
            this.win = {document: this.textarea};
            this.ready = true;
            this.wrapping = document.createElement('div');

            var textareaParent = this.textarea.parentNode;

            this.wrapping.appendChild(this.textarea);
            textareaParent.appendChild(this.wrapping);

            this.textarea.style.opacity = 1;
        };

        TouchEditor.prototype = {
            setOption: function (type, handler) {
                if (type === 'onChange') {
                    $(this.textarea).change(handler);
                }
            },
            eachLine: function () {
                return [];
            },
            getValue: function () {
                return this.textarea.value;
            },
            setValue: function (code) {
                this.textarea.value = code;
            },
            focus: noop,
            getCursor: function () {
                return {line: 0, ch: 0};
            },
            setCursor: noop,
            currentLine: function () {
                return 0;
            },
            cursorPosition: function () {
                return {character: 0};
            },
            addMarkdown: noop,
            nthLine: noop,
            refresh: noop,
            selectLines: noop,
            on: noop,
            off: noop
        };

        return TouchEditor;
    };

    __exports__["default"] = createTouchEditor;
  });
define("ghost/assets/lib/uploader", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var UploadUi,
        upload,
        Ghost = ghostPaths();

    UploadUi = function ($dropzone, settings) {
        var $url = '<div class="js-url"><input class="url js-upload-url" type="url" placeholder="http://"/></div>',
            $cancel = '<a class="image-cancel js-cancel" title="Delete"><span class="hidden">Delete</span></a>',
            $progress =  $('<div />', {
                class: 'js-upload-progress progress progress-success active',
                role: 'progressbar',
                'aria-valuemin': '0',
                'aria-valuemax': '100'
            }).append($('<div />', {
                class: 'js-upload-progress-bar bar',
                style: 'width:0%'
            }));

        $.extend(this, {
            complete: function (result) {
                var self = this;

                function showImage(width, height) {
                    $dropzone.find('img.js-upload-target').attr({width: width, height: height}).css({display: 'block'});
                    $dropzone.find('.fileupload-loading').remove();
                    $dropzone.css({height: 'auto'});
                    $dropzone.delay(250).animate({opacity: 100}, 1000, function () {
                        $('.js-button-accept').prop('disabled', false);
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
                        .attr({src: '', width: 'auto', height: 'auto'});

                    $progress.animate({opacity: 0}, 250, function () {
                        $dropzone.find('span.media').after('<img class="fileupload-loading"  src="' + Ghost.subdir + '/ghost/img/loadingcat.gif" />');
                        if (!settings.editor) {$progress.find('.fileupload-loading').css({top: '56px'}); }
                    });
                    $dropzone.trigger('uploadsuccess', [result]);
                    $img.one('load', function () {
                        animateDropzone($img);
                    }).attr('src', result);
                }
                preLoadImage();
            },

            bindFileUpload: function () {
                var self = this;

                $dropzone.find('.js-fileupload').fileupload().fileupload('option', {
                    url: Ghost.apiRoot + '/uploads/',
                    add: function (e, data) {
                        /*jshint unused:false*/
                        $('.js-button-accept').prop('disabled', true);
                        $dropzone.find('.js-fileupload').removeClass('right');
                        $dropzone.find('.js-url').remove();
                        $progress.find('.js-upload-progress-bar').removeClass('fail');
                        $dropzone.trigger('uploadstart', [$dropzone.attr('id')]);
                        $dropzone.find('span.media, div.description, a.image-url, a.image-webcam')
                            .animate({opacity: 0}, 250, function () {
                                $dropzone.find('div.description').hide().css({opacity: 100});
                                if (settings.progressbar) {
                                    $dropzone.find('div.js-fail').after($progress);
                                    $progress.animate({opacity: 100}, 250);
                                }
                                data.submit();
                            });
                    },
                    dropZone: settings.fileStorage ? $dropzone : null,
                    progressall: function (e, data) {
                        /*jshint unused:false*/
                        var progress = parseInt(data.loaded / data.total * 100, 10);
                        if (!settings.editor) {$progress.find('div.js-progress').css({position: 'absolute', top: '40px'}); }
                        if (settings.progressbar) {
                            $dropzone.trigger('uploadprogress', [progress, data]);
                            $progress.find('.js-upload-progress-bar').css('width', progress + '%');
                        }
                    },
                    fail: function (e, data) {
                        /*jshint unused:false*/
                        $('.js-button-accept').prop('disabled', false);
                        $dropzone.trigger('uploadfailure', [data.result]);
                        $dropzone.find('.js-upload-progress-bar').addClass('fail');
                        if (data.jqXHR.status === 413) {
                            $dropzone.find('div.js-fail').text('The image you uploaded was larger than the maximum file size your server allows.');
                        } else if (data.jqXHR.status === 415) {
                            $dropzone.find('div.js-fail').text('The image type you uploaded is not supported. Please use .PNG, .JPG, .GIF, .SVG.');
                        } else {
                            $dropzone.find('div.js-fail').text('Something went wrong :(');
                        }
                        $dropzone.find('div.js-fail, button.js-fail').fadeIn(1500);
                        $dropzone.find('button.js-fail').on('click', function () {
                            $dropzone.css({minHeight: 0});
                            $dropzone.find('div.description').show();
                            self.removeExtras();
                            self.init();
                        });
                    },
                    done: function (e, data) {
                        /*jshint unused:false*/
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
                    $dropzone.append('<button class="js-fail btn btn-green" style="display: none">Try Again</button>');
                }
                if (!$dropzone.find('a.image-url')[0]) {
                    $dropzone.append('<a class="image-url" title="Add image from URL"><span class="hidden">URL</span></a>');
                }
               // if (!$dropzone.find('a.image-webcam')[0]) {
               //     $dropzone.append('<a class="image-webcam" title="Add image from webcam"><span class="hidden">Webcam</span></a>');
               // }
            },

            removeExtras: function () {
                $dropzone.find('span.media, div.js-upload-progress, a.image-url, a.image-upload, a.image-webcam, div.js-fail, button.js-fail, a.js-cancel').remove();
            },

            initWithDropzone: function () {
                var self = this;

                // This is the start point if no image exists
                $dropzone.find('img.js-upload-target').css({display: 'none'});
                $dropzone.find('div.description').show();
                $dropzone.removeClass('pre-image-uploader image-uploader-url').addClass('image-uploader');
                this.removeExtras();
                this.buildExtras();
                this.bindFileUpload();
                if (!settings.fileStorage) {
                    self.initUrl();
                    return;
                }
                $dropzone.find('a.image-url').on('click', function () {
                    self.initUrl();
                });
            },
            initUrl: function () {
                var self = this, val;
                this.removeExtras();
                $dropzone.addClass('image-uploader-url').removeClass('pre-image-uploader');
                $dropzone.find('.js-fileupload').addClass('right');
                if (settings.fileStorage) {
                    $dropzone.append($cancel);
                }
                $dropzone.find('.js-cancel').on('click', function () {
                    $dropzone.find('.js-url').remove();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    $dropzone.trigger('imagecleared');
                    self.removeExtras();
                    self.initWithDropzone();
                });

                $dropzone.find('div.description').before($url);

                if (settings.editor) {
                    $dropzone.find('div.js-url').append('<button class="btn btn-blue js-button-accept">Save</button>');
                }

                $dropzone.find('.js-button-accept').on('click', function () {
                    val = $dropzone.find('.js-upload-url').val();
                    $dropzone.find('div.description').hide();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    $dropzone.find('.js-url').remove();
                    if (val === '') {
                        $dropzone.trigger('uploadsuccess', 'http://');
                        self.initWithDropzone();
                    } else {
                        self.complete(val);
                    }
                });

                // Only show the toggle icon if there is a dropzone mode to go back to
                if (settings.fileStorage !== false) {
                    $dropzone.append('<a class="image-upload" title="Add image"><span class="hidden">Upload</span></a>');
                }

                $dropzone.find('a.image-upload').on('click', function () {
                    $dropzone.find('.js-url').remove();
                    $dropzone.find('.js-fileupload').removeClass('right');
                    self.initWithDropzone();
                });
            },

            initWithImage: function () {
                var self = this;

                // This is the start point if an image already exists
                $dropzone.removeClass('image-uploader image-uploader-url').addClass('pre-image-uploader');
                $dropzone.find('div.description').hide();
                $dropzone.find('img.js-upload-target').show();
                $dropzone.append($cancel);
                $dropzone.find('.js-cancel').on('click', function () {
                    $dropzone.find('img.js-upload-target').attr({src: ''});
                    $dropzone.find('div.description').show();
                    $dropzone.trigger('imagecleared');
                    $dropzone.delay(2500).animate({opacity: 100}, 1000, function () {
                        self.init();
                    });

                    $dropzone.trigger('uploadsuccess', 'http://');
                    self.initWithDropzone();
                });
            },

            init: function () {
                var imageTarget = $dropzone.find('img.js-upload-target');
                // First check if field image is defined by checking for js-upload-target class
                if (!imageTarget[0]) {
                    // This ensures there is an image we can hook into to display uploaded image
                    $dropzone.prepend('<img class="js-upload-target" style="display: none"  src="" />');
                }
                $('.js-button-accept').prop('disabled', false);
                if (imageTarget.attr('src') === '' || imageTarget.attr('src') === undefined) {
                    this.initWithDropzone();
                } else {
                    this.initWithImage();
                }
            },

            reset: function () {
                $dropzone.find('.js-url').remove();
                $dropzone.find('.js-fileupload').removeClass('right');
                this.removeExtras();
                this.initWithDropzone();
            }
        });
    };

    upload = function (options) {
        var settings = $.extend({
            progressbar: true,
            editor: false,
            fileStorage: true
        }, options);

        return this.each(function () {
            var $dropzone = $(this),
                ui;

            ui = new UploadUi($dropzone, settings);
            this.uploaderUi = ui;
            ui.init();
        });
    };

    __exports__["default"] = upload;
  });
define("ghost/components/gh-activating-list-item", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ActivatingListItem = Ember.Component.extend({
        tagName: 'li',
        classNameBindings: ['active'],
        active: false,

        unfocusLink: function () {
            this.$('a').blur();
        }.on('click')
    });

    __exports__["default"] = ActivatingListItem;
  });
define("ghost/components/gh-codemirror", 
  ["ghost/mixins/marker-manager","ghost/utils/codemirror-mobile","ghost/utils/set-scroll-classname","ghost/utils/codemirror-shortcuts","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    /*global CodeMirror */

    var MarkerManager = __dependency1__["default"];
    var mobileCodeMirror = __dependency2__["default"];
    var setScrollClassName = __dependency3__["default"];
    var codeMirrorShortcuts = __dependency4__["default"];

    var onChangeHandler,
        onScrollHandler,
        Codemirror;

    codeMirrorShortcuts.init();

    onChangeHandler = function (cm, changeObj) {
        var line,
            component = cm.component;

        // fill array with a range of numbers
        for (line = changeObj.from.line; line < changeObj.from.line + changeObj.text.length; line += 1) {
            component.checkLine.call(component, line, changeObj.origin);
        }

        // Is this a line which may have had a marker on it?
        component.checkMarkers.call(component);

        cm.component.set('value', cm.getValue());

        component.sendAction('typingPause');
    };

    onScrollHandler = function (cm) {
        var scrollInfo = cm.getScrollInfo(),
            component = cm.component;

        scrollInfo.codemirror = cm;

        // throttle scroll updates
        component.throttle = Ember.run.throttle(component, function () {
            this.set('scrollInfo', scrollInfo);
        }, 10);
    };

    Codemirror = Ember.TextArea.extend(MarkerManager, {
        focus: true,
        focusCursorAtEnd: false,

        setFocus: function () {
            if (this.get('focus')) {
                this.$().val(this.$().val()).focus();
            }
        }.on('didInsertElement'),

        didInsertElement: function () {
            Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
        },

        afterRenderEvent: function () {
            var self = this,
                codemirror;

            // replaces CodeMirror with TouchEditor only if we're on mobile
            mobileCodeMirror.createIfMobile();

            codemirror = this.initCodemirror();
            this.set('codemirror', codemirror);

            this.sendAction('setCodeMirror', this);

            if (this.get('focus') && this.get('focusCursorAtEnd')) {
                codemirror.execCommand('goDocEnd');
            }

            codemirror.eachLine(function initMarkers() {
                self.initMarkers.apply(self, arguments);
            });
        },

        // this needs to be placed on the 'afterRender' queue otherwise CodeMirror gets wonky
        initCodemirror: function () {
            // create codemirror
            var codemirror,
                self = this;

            codemirror = CodeMirror.fromTextArea(this.get('element'), {
                mode:           'gfm',
                tabMode:        'indent',
                tabindex:       '2',
                cursorScrollMargin: 10,
                lineWrapping:   true,
                dragDrop:       false,
                extraKeys: {
                    Home:   'goLineLeft',
                    End:    'goLineRight',
                    'Ctrl-U': false,
                    'Cmd-U': false,
                    'Shift-Ctrl-U': false,
                    'Shift-Cmd-U': false,
                    'Ctrl-S': false,
                    'Cmd-S': false,
                    'Ctrl-D': false,
                    'Cmd-D': false
                }
            });

            // Codemirror needs a reference to the component
            // so that codemirror originating events can propogate
            // up the ember action pipeline
            codemirror.component = this;

            // propagate changes to value property
            codemirror.on('change', onChangeHandler);

            // on scroll update scrollPosition property
            codemirror.on('scroll', onScrollHandler);

            codemirror.on('scroll', Ember.run.bind(Ember.$('.CodeMirror-scroll'), setScrollClassName, {
                target: Ember.$('.js-entry-markdown'),
                offset: 10
            }));

            codemirror.on('focus', function () {
                self.sendAction('onFocusIn');
            });

            return codemirror;
        },

        disableCodeMirror: function () {
            var codemirror = this.get('codemirror');

            codemirror.setOption('readOnly', 'nocursor');
            codemirror.off('change', onChangeHandler);
        },

        enableCodeMirror: function () {
            var codemirror = this.get('codemirror');

            codemirror.setOption('readOnly', false);

            // clicking the trash button on an image dropzone causes this function to fire.
            // this line is a hack to prevent multiple event handlers from being attached.
            codemirror.off('change', onChangeHandler);

            codemirror.on('change', onChangeHandler);
        },

        removeThrottle: function () {
            Ember.run.cancel(this.throttle);
        }.on('willDestroyElement'),

        removeCodemirrorHandlers: function () {
            // not sure if this is needed.
            var codemirror = this.get('codemirror');
            codemirror.off('change', onChangeHandler);
            codemirror.off('scroll');
        }.on('willDestroyElement'),

        clearMarkerManagerMarkers: function () {
            this.clearMarkers();
        }.on('willDestroyElement')
    });

    __exports__["default"] = Codemirror;
  });
define("ghost/components/gh-dropdown-button", 
  ["ghost/mixins/dropdown-mixin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownMixin = __dependency1__["default"];

    var DropdownButton = Ember.Component.extend(DropdownMixin, {
        tagName: 'button',

        // matches with the dropdown this button toggles
        dropdownName: null,

        // Notify dropdown service this dropdown should be toggled
        click: function (event) {
            this._super(event);
            this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
        }
    });

    __exports__["default"] = DropdownButton;
  });
define("ghost/components/gh-dropdown", 
  ["ghost/mixins/dropdown-mixin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownMixin = __dependency1__["default"];

    var GhostDropdown = Ember.Component.extend(DropdownMixin, {
        classNames: 'ghost-dropdown',
        name: null,
        closeOnClick: false,

        // Helps track the user re-opening the menu while it's fading out.
        closing: false,

        // Helps track whether the dropdown is open or closes, or in a transition to either
        isOpen: false,

        // Managed the toggle between the fade-in and fade-out classes
        fadeIn: Ember.computed('isOpen', 'closing', function () {
            return this.get('isOpen') && !this.get('closing');
        }),

        classNameBindings: ['fadeIn:fade-in-scale:fade-out', 'isOpen:open:closed'],

        open: function () {
            this.set('isOpen', true);
            this.set('closing', false);
            this.set('button.isOpen', true);
        },

        close: function () {
            var self = this;

            this.set('closing', true);

            if (this.get('button')) {
                this.set('button.isOpen', false);
            }
            this.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
                if (event.originalEvent.animationName === 'fade-out') {
                    if (self.get('closing')) {
                        self.set('isOpen', false);
                        self.set('closing', false);
                    }
                }
            });
        },

        // Called by the dropdown service when any dropdown button is clicked.
        toggle: function (options) {
            var isClosing = this.get('closing'),
                isOpen = this.get('isOpen'),
                name = this.get('name'),
                button = this.get('button'),
                targetDropdownName = options.target;

            if (name === targetDropdownName && (!isOpen || isClosing)) {
                if (!button) {
                    button = options.button;
                    this.set('button', button);
                }
                this.open();
            } else if (isOpen) {
                this.close();
            }
        },

        click: function (event) {
            this._super(event);

            if (this.get('closeOnClick')) {
                return this.close();
            }
        },

        didInsertElement: function () {
            this._super();

            var dropdownService = this.get('dropdown');

            dropdownService.on('close', this, this.close);
            dropdownService.on('toggle', this, this.toggle);
        },

        willDestroyElement: function () {
            this._super();

            var dropdownService = this.get('dropdown');

            dropdownService.off('close', this, this.close);
            dropdownService.off('toggle', this, this.toggle);
        }
    });

    __exports__["default"] = GhostDropdown;
  });
define("ghost/components/gh-file-upload", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var FileUpload = Ember.Component.extend({
        _file: null,

        uploadButtonText: 'Text',

        uploadButtonDisabled: true,

        change: function (event) {
            this.set('uploadButtonDisabled', false);
            this.sendAction('onAdd');
            this._file = event.target.files[0];
        },

        onUpload: 'onUpload',

        actions: {
            upload: function () {
                if (!this.uploadButtonDisabled && this._file) {
                    this.sendAction('onUpload', this._file);
                }

                // Prevent double post by disabling the button.
                this.set('uploadButtonDisabled', true);
            }
        }
    });

    __exports__["default"] = FileUpload;
  });
define("ghost/components/gh-form", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Form = Ember.View.extend({
        tagName: 'form',
        attributeBindings: ['enctype'],
        reset: function () {
            this.$().get(0).reset();
        },
        didInsertElement: function () {
            this.get('controller').on('reset', this, this.reset);
        },
        willClearRender: function () {
            this.get('controller').off('reset', this, this.reset);
        }
    });

    __exports__["default"] = Form;
  });
define("ghost/components/gh-input", 
  ["ghost/mixins/text-input","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var TextInputMixin = __dependency1__["default"];

    var Input = Ember.TextField.extend(TextInputMixin);

    __exports__["default"] = Input;
  });
define("ghost/components/gh-markdown", 
  ["ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var uploader = __dependency1__["default"];

    var Markdown = Ember.Component.extend({
        didInsertElement: function () {
            this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
        },

        adjustScrollPosition: function () {
            var scrollWrapper = this.get('scrollWrapper'),
                scrollPosition = this.get('scrollPosition');

            scrollWrapper.scrollTop(scrollPosition);
        }.observes('scrollPosition'),

        // fire off 'enable' API function from uploadManager
        // might need to make sure markdown has been processed first
        reInitDropzones: function () {
            function handleDropzoneEvents() {
                var dropzones = $('.js-drop-zone');

                uploader.call(dropzones, {
                    editor: true,
                    fileStorage: this.get('config.fileStorage')
                });

                dropzones.on('uploadstart', Ember.run.bind(this, 'sendAction', 'uploadStarted'));
                dropzones.on('uploadfailure', Ember.run.bind(this, 'sendAction', 'uploadFinished'));
                dropzones.on('uploadsuccess', Ember.run.bind(this, 'sendAction', 'uploadFinished'));
                dropzones.on('uploadsuccess', Ember.run.bind(this, 'sendAction', 'uploadSuccess'));
            }

            Ember.run.scheduleOnce('afterRender', this, handleDropzoneEvents);
        }.observes('markdown')
    });

    __exports__["default"] = Markdown;
  });
define("ghost/components/gh-modal-dialog", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ModalDialog = Ember.Component.extend({
        didInsertElement: function () {
            this.$('.js-modal-container, .js-modal-background').addClass('fade-in open');
            this.$('.js-modal').addClass('open');
        },

        close: function () {
            var self = this;

            this.$('.js-modal, .js-modal-background').removeClass('fade-in').addClass('fade-out');

            // The background should always be the last thing to fade out, so check on that instead of the content
            this.$('.js-modal-background').on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
                if (event.originalEvent.animationName === 'fade-out') {
                    self.$('.js-modal, .js-modal-background').removeClass('open');
                }
            });

            this.sendAction();
        },

        confirmaccept: 'confirmAccept',
        confirmreject: 'confirmReject',

        actions: {
            closeModal: function () {
                this.close();
            },
            confirm: function (type) {
                this.sendAction('confirm' + type);
                this.close();
            },
            noBubble: Ember.K
        },

        klass: Ember.computed('type', 'style', function () {
            var classNames = [];

            classNames.push(this.get('type') ? 'modal-' + this.get('type') : 'modal');

            if (this.get('style')) {
                this.get('style').split(',').forEach(function (style) {
                    classNames.push('modal-style-' + style);
                });
            }

            return classNames.join(' ');
        }),

        acceptButtonClass: Ember.computed('confirm.accept.buttonClass', function () {
            return this.get('confirm.accept.buttonClass') ? this.get('confirm.accept.buttonClass') : 'btn btn-green';
        }),

        rejectButtonClass: Ember.computed('confirm.reject.buttonClass', function () {
            return this.get('confirm.reject.buttonClass') ? this.get('confirm.reject.buttonClass') : 'btn btn-red';
        })
    });

    __exports__["default"] = ModalDialog;
  });
define("ghost/components/gh-notification", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NotificationComponent = Ember.Component.extend({
        classNames: ['js-bb-notification'],

        typeClass: Ember.computed(function () {
            var classes = '',
                message = this.get('message'),
                type,
                dismissible;

            // Check to see if we're working with a DS.Model or a plain JS object
            if (typeof message.toJSON === 'function') {
                type = message.get('type');
                dismissible = message.get('dismissible');
            } else {
                type = message.type;
                dismissible = message.dismissible;
            }

            classes += 'notification-' + type;

            if (type === 'success' && dismissible !== false) {
                classes += ' notification-passive';
            }

            return classes;
        }),

        didInsertElement: function () {
            var self = this;

            self.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
                if (event.originalEvent.animationName === 'fade-out') {
                    self.notifications.removeObject(self.get('message'));
                }
            });
        },

        actions: {
            closeNotification: function () {
                var self = this;
                self.notifications.closeNotification(self.get('message'));
            }
        }
    });

    __exports__["default"] = NotificationComponent;
  });
define("ghost/components/gh-notifications", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NotificationsComponent = Ember.Component.extend({
        tagName: 'aside',
        classNames: 'notifications',
        classNameBindings: ['location'],

        messages: Ember.computed.filter('notifications', function (notification) {
            // If this instance of the notifications component has no location affinity
            // then it gets all notifications
            if (!this.get('location')) {
                return true;
            }

            var displayLocation = (typeof notification.toJSON === 'function') ?
                notification.get('location') : notification.location;

            return this.get('location') === displayLocation;
        }),

        messageCountObserver: function () {
            this.sendAction('notify', this.get('messages').length);
        }.observes('messages.[]')
    });

    __exports__["default"] = NotificationsComponent;
  });
define("ghost/components/gh-popover-button", 
  ["ghost/components/gh-dropdown-button","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownButton = __dependency1__["default"];

    var PopoverButton = DropdownButton.extend({
        click: Ember.K, // We don't want clicks on popovers, but dropdowns have them. So `K`ill them here.

        mouseEnter: function (event) {
            this._super(event);
            this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
        },

        mouseLeave: function (event) {
            this._super(event);
            this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
        }
    });

    __exports__["default"] = PopoverButton;
  });
define("ghost/components/gh-popover", 
  ["ghost/components/gh-dropdown","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var GhostDropdown = __dependency1__["default"];

    var GhostPopover = GhostDropdown.extend({
        classNames: 'ghost-popover'
    });

    __exports__["default"] = GhostPopover;
  });
define("ghost/components/gh-role-selector", 
  ["ghost/components/gh-select","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var GhostSelect = __dependency1__["default"];

    var RolesSelector = GhostSelect.extend({
        roles: Ember.computed.alias('options'),

        options: Ember.computed(function () {
            var rolesPromise = this.store.find('role', {permissions: 'assign'});

            return Ember.ArrayProxy.extend(Ember.PromiseProxyMixin)
                .create({promise: rolesPromise});
        })
    });

    __exports__["default"] = RolesSelector;
  });
define("ghost/components/gh-select", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // GhostSelect is a solution to Ember.Select being evil and worthless.
    // (Namely, this solves problems with async data in Ember.Select)
    // Inspired by (that is, totally ripped off from) this JSBin
    // http://emberjs.jsbin.com/rwjblue/40/edit

    // Usage:
    // Extend this component and create a template for your component.
    // Your component must define the `options` property.
    // Optionally use `initialValue` to set the object
    //     you want to have selected to start with.
    // Both options and initalValue are promise safe.
    // Set onChange in your template to be the name
    //    of the action you want called in your
    // For an example, see gh-roles-selector

    var GhostSelect = Ember.Component.extend({
        tagName: 'span',
        classNames: ['gh-select'],
        attributeBindings: ['tabindex'],

        tabindex: '0', // 0 must be a string, or else it's interpreted as false

        options: null,
        initialValue: null,

        resolvedOptions: null,
        resolvedInitialValue: null,

        // Convert promises to their values
        init: function () {
            var self = this;

            this._super.apply(this, arguments);

            Ember.RSVP.hash({
                resolvedOptions: this.get('options'),
                resolvedInitialValue: this.get('initialValue')
            }).then(function (resolvedHash) {
                self.setProperties(resolvedHash);

                // Run after render to ensure the <option>s have rendered
                Ember.run.schedule('afterRender', function () {
                    self.setInitialValue();
                });
            });
        },

        setInitialValue: function () {
            var initialValue = this.get('resolvedInitialValue'),
                options = this.get('resolvedOptions'),
                initialValueIndex = options.indexOf(initialValue);

            if (initialValueIndex > -1) {
                this.$('option:eq(' + initialValueIndex + ')').prop('selected', true);
            }
        },

        // Called by DOM events
        change: function () {
            this._changeSelection();
        },

        // Send value to specified action
        _changeSelection: function () {
            var value = this._selectedValue();

            Ember.set(this, 'value', value);
            this.sendAction('onChange', value);
        },

        _selectedValue: function () {
            var selectedIndex = this.$('select')[0].selectedIndex;

            return this.get('options').objectAt(selectedIndex);
        }
    });

    __exports__["default"] = GhostSelect;
  });
define("ghost/components/gh-tab-pane", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // See gh-tabs-manager.js for use
    var TabPane = Ember.Component.extend({
        classNameBindings: ['active'],

        tabsManager: Ember.computed(function () {
            return this.nearestWithProperty('isTabsManager');
        }),

        tab: Ember.computed('tabsManager.tabs.[]', 'tabsManager.tabPanes.[]', function () {
            var index = this.get('tabsManager.tabPanes').indexOf(this),
                tabs = this.get('tabsManager.tabs');

            return tabs && tabs.objectAt(index);
        }),

        active: Ember.computed.alias('tab.active'),

        // Register with the tabs manager
        registerWithTabs: function () {
            this.get('tabsManager').registerTabPane(this);
        }.on('didInsertElement'),

        unregisterWithTabs: function () {
            this.get('tabsManager').unregisterTabPane(this);
        }.on('willDestroyElement')
    });

    __exports__["default"] = TabPane;
  });
define("ghost/components/gh-tab", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // See gh-tabs-manager.js for use
    var Tab = Ember.Component.extend({
        tabsManager: Ember.computed(function () {
            return this.nearestWithProperty('isTabsManager');
        }),

        active: Ember.computed('tabsManager.activeTab', function () {
            return this.get('tabsManager.activeTab') === this;
        }),

        index: Ember.computed('tabsManager.tabs.@each', function () {
            return this.get('tabsManager.tabs').indexOf(this);
        }),

        // Select on click
        click: function () {
            this.get('tabsManager').select(this);
        },

        // Registration methods
        registerWithTabs: function () {
            this.get('tabsManager').registerTab(this);
        }.on('didInsertElement'),

        unregisterWithTabs: function () {
            this.get('tabsManager').unregisterTab(this);
        }.on('willDestroyElement')
    });

    __exports__["default"] = Tab;
  });
define("ghost/components/gh-tabs-manager", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
    Heavily inspired by ic-tabs (https://github.com/instructure/ic-tabs)

    Three components work together for smooth tabbing.
    1. tabs-manager (gh-tabs)
    2. tab (gh-tab)
    3. tab-pane (gh-tab-pane)

    ## Usage:
    The tabs-manager must wrap all tab and tab-pane components,
    but they can be nested at any level.

    A tab and its pane are tied together via their order.
    So, the second tab within a tab manager will activate
    the second pane within that manager.

    ```hbs
    {{#gh-tabs-manager}}
      {{#gh-tab}}
        First tab
      {{/gh-tab}}
      {{#gh-tab}}
        Second tab
      {{/gh-tab}}

      ....
      {{#gh-tab-pane}}
        First pane
      {{/gh-tab-pane}}
      {{#gh-tab-pane}}
        Second pane
      {{/gh-tab-pane}}
    {{/gh-tabs-manager}}
    ```
    ## Options:

    the tabs-manager will send a "selected" action whenever one of its
    tabs is clicked.
    ```hbs
    {{#gh-tabs-manager selected="myAction"}}
        ....
    {{/gh-tabs-manager}}
    ```

    ## Styling:
    Both tab and tab-pane elements have an "active"
    class applied when they are active.

    */
    var TabsManager = Ember.Component.extend({
        activeTab: null,
        tabs: [],
        tabPanes: [],

        // Called when a gh-tab is clicked.
        select: function (tab) {
            this.set('activeTab', tab);
            this.sendAction('selected');
        },

        // Used by children to find this tabsManager
        isTabsManager: true,

        // Register tabs and their panes to allow for
        // interaction between components.
        registerTab: function (tab) {
            this.get('tabs').addObject(tab);
        },

        unregisterTab: function (tab) {
            this.get('tabs').removeObject(tab);
        },

        registerTabPane: function (tabPane) {
            this.get('tabPanes').addObject(tabPane);
        },

        unregisterTabPane: function (tabPane) {
            this.get('tabPanes').removeObject(tabPane);
        }
    });

    __exports__["default"] = TabsManager;
  });
define("ghost/components/gh-textarea", 
  ["ghost/mixins/text-input","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var TextInputMixin = __dependency1__["default"];

    var TextArea = Ember.TextArea.extend(TextInputMixin);

    __exports__["default"] = TextArea;
  });
define("ghost/components/gh-trim-focus-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global device*/
    var TrimFocusInput = Ember.TextField.extend({
        focus: true,

        attributeBindings: ['autofocus'],

        autofocus: Ember.computed(function () {
            return (device.ios()) ? false : 'autofocus';
        }),

        setFocus: function () {
            // This fix is required until Mobile Safari has reliable
            // autofocus, select() or focus() support
            if (this.focus && !device.ios()) {
                this.$().val(this.$().val()).focus();
            }
        }.on('didInsertElement'),

        focusOut: function () {
            var text = this.$().val();

            this.$().val(text.trim());
        }
    });

    __exports__["default"] = TrimFocusInput;
  });
define("ghost/components/gh-upload-modal", 
  ["ghost/components/gh-modal-dialog","ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ModalDialog = __dependency1__["default"];
    var upload = __dependency2__["default"];

    var UploadModal = ModalDialog.extend({
        layoutName: 'components/gh-modal-dialog',

        didInsertElement: function () {
            this._super();
            upload.call(this.$('.js-drop-zone'), {fileStorage: this.get('config.fileStorage')});
        },
        confirm: {
            reject: {
                func: function () { // The function called on rejection
                    return true;
                },
                buttonClass: 'btn btn-default',
                text: 'Cancel' // The reject button text
            },
            accept: {
                buttonClass: 'btn btn-blue right',
                text: 'Save', // The accept button texttext: 'Save'
                func: function () {
                    var imageType = 'model.' + this.get('imageType');

                    if (this.$('.js-upload-url').val()) {
                        this.set(imageType, this.$('.js-upload-url').val());
                    } else {
                        this.set(imageType, this.$('.js-upload-target').attr('src'));
                    }
                    return true;
                }
            }
        },

        actions: {
            closeModal: function () {
                this.sendAction();
            },
            confirm: function (type) {
                var func = this.get('confirm.' + type + '.func');
                if (typeof func === 'function') {
                    func.apply(this);
                }
                this.sendAction();
                this.sendAction('confirm' + type);
            }
        }
    });

    __exports__["default"] = UploadModal;
  });
define("ghost/components/gh-uploader", 
  ["ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var uploader = __dependency1__["default"];

    var PostImageUploader = Ember.Component.extend({
        classNames: ['image-uploader', 'js-post-image-upload'],

        setup: function () {
            var $this = this.$(),
                self = this;

            this.set('uploaderReference', uploader.call($this, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            }));

            $this.on('uploadsuccess', function (event, result) {
                if (result && result !== '' && result !== 'http://') {
                    self.sendAction('uploaded', result);
                }
            });

            $this.on('imagecleared', function () {
                self.sendAction('canceled');
            });
        }.on('didInsertElement'),

        removeListeners: function () {
            var $this = this.$();

            $this.off();
            $this.find('.js-cancel').off();
        }.on('willDestroyElement')
    });

    __exports__["default"] = PostImageUploader;
  });
define("ghost/components/gh-url-preview", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*
    Example usage:
    {{gh-url-preview prefix="tag" slug=theSlugValue tagName="p" classNames="description"}}
    */
    var urlPreview = Ember.Component.extend({
        classNames: 'ghost-url-preview',
        prefix: null,
        slug: null,
        theUrl: null,

        generateUrl: function () {
            // Get the blog URL and strip the scheme
            var blogUrl = this.get('config').blogUrl,
                noSchemeBlogUrl = blogUrl.substr(blogUrl.indexOf('://') + 3), // Remove `http[s]://`

                // Get the prefix and slug values
                prefix = this.get('prefix') ? this.get('prefix') + '/' : '',
                slug = this.get('slug') ? this.get('slug') : '',

                // Join parts of the URL together with slashes
                theUrl = noSchemeBlogUrl + '/' + prefix + slug;

            this.set('the-url', theUrl);
        }.on('didInsertElement').observes('slug')
    });

    __exports__["default"] = urlPreview;
  });
define("ghost/config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function configureApp(App) {
        if (!App instanceof Ember.Application) {
            return;
        }

        App.reopen({
            LOG_ACTIVE_GENERATION: true,
            LOG_MODULE_RESOLVER: true,
            LOG_TRANSITIONS: true,
            LOG_TRANSITIONS_INTERNAL: true,
            LOG_VIEW_LOOKUPS: true
        });
    }

    __exports__["default"] = configureApp;
  });
define("ghost/controllers/application", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ApplicationController = Ember.Controller.extend({
        // jscs: disable
        hideNav: Ember.computed.match('currentPath', /(error|signin|signup|setup|forgotten|reset)/),
        // jscs: enable

        topNotificationCount: 0,
        showGlobalMobileNav: false,
        showSettingsMenu: false,

         userImageAlt: Ember.computed('session.user.name', function () {
            var name = this.get('session.user.name');

            return name + '\'s profile picture';
        }),

        actions: {
            topNotificationChange: function (count) {
                this.set('topNotificationCount', count);
            }
        }
    });

    __exports__["default"] = ApplicationController;
  });
define("ghost/controllers/editor/edit", 
  ["ghost/mixins/editor-base-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorControllerMixin = __dependency1__["default"];

    var EditorEditController = Ember.Controller.extend(EditorControllerMixin);

    __exports__["default"] = EditorEditController;
  });
define("ghost/controllers/editor/new", 
  ["ghost/mixins/editor-base-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorControllerMixin = __dependency1__["default"];

    var EditorNewController = Ember.Controller.extend(EditorControllerMixin, {
        actions: {
            /**
              * Redirect to editor after the first save
              */
            save: function (options) {
                var self = this;
                return this._super(options).then(function (model) {
                    if (model.get('id')) {
                        self.replaceRoute('editor.edit', model);
                    }
                });
            }
        }
    });

    __exports__["default"] = EditorNewController;
  });
define("ghost/controllers/error", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ErrorController = Ember.Controller.extend({
        code: Ember.computed('content.status', function () {
            return this.get('content.status') > 200 ? this.get('content.status') : 500;
        }),
        message: Ember.computed('content.statusText', function () {
            if (this.get('code') === 404) {
                return 'No Ghost Found';
            }

            return this.get('content.statusText') !== 'error' ? this.get('content.statusText') : 'Internal Server Error';
        }),
        stack: false
    });

    __exports__["default"] = ErrorController;
  });
define("ghost/controllers/feature", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var FeatureController = Ember.Controller.extend(Ember.PromiseProxyMixin, {
        init: function () {
            var promise;

            promise = this.store.find('setting', {type: 'blog,theme'}).then(function (settings) {
                return settings.get('firstObject');
            });

            this.set('promise', promise);
        },

        setting: Ember.computed.alias('content'),

        labs: Ember.computed('isSettled', 'setting.labs', function () {
            var value = {};

            if (this.get('isFulfilled')) {
                try {
                    value = JSON.parse(this.get('setting.labs') || {});
                } catch (err) {
                    value = {};
                }
            }

            return value;
        }),

        tagsUI: Ember.computed('config.tagsUI', 'labs.tagsUI', function () {
            return this.get('config.tagsUI') || this.get('labs.tagsUI');
        }),

        codeInjectionUI: Ember.computed('config.codeInjectionUI', 'labs.codeInjectionUI', function () {
            return this.get('config.codeInjectionUI') || this.get('labs.codeInjectionUI');
        })
    });

    __exports__["default"] = FeatureController;
  });
define("ghost/controllers/forgotten", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];
    var ValidationEngine = __dependency2__["default"];

    var ForgottenController = Ember.Controller.extend(ValidationEngine, {
        email: '',
        submitting: false,

        // ValidationEngine settings
        validationType: 'forgotten',

        actions: {
            submit: function () {
                var self = this,
                    data = self.getProperties('email');

                this.toggleProperty('submitting');
                this.validate({format: false}).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                        type: 'POST',
                        data: {
                            passwordreset: [{
                                email: data.email
                            }]
                        }
                    }).then(function () {
                        self.toggleProperty('submitting');
                        self.notifications.showSuccess('Please check your email for instructions.', {delayed: true});
                        self.set('email', '');
                        self.transitionToRoute('signin');
                    }).catch(function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showAPIError(resp, {defaultErrorText: 'There was a problem with the reset, please try again.'});
                    });
                }).catch(function (errors) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = ForgottenController;
  });
define("ghost/controllers/modals/copy-html", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var CopyHTMLController = Ember.Controller.extend({

        generatedHTML: Ember.computed.alias('model.generatedHTML')

    });

    __exports__["default"] = CopyHTMLController;
  });
define("ghost/controllers/modals/delete-all", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeleteAllController = Ember.Controller.extend({
        actions: {
            confirmAccept: function () {
                var self = this;

                ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                    type: 'DELETE'
                }).then(function () {
                    self.notifications.showSuccess('All content deleted from database.');
                    self.store.unloadAll('post');
                    self.store.unloadAll('tag');
                }).catch(function (response) {
                    self.notifications.showErrors(response);
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: 'Delete',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = DeleteAllController;
  });
define("ghost/controllers/modals/delete-post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeletePostController = Ember.Controller.extend({
        actions: {
            confirmAccept: function () {
                var self = this,
                    model = this.get('model');

                // definitely want to clear the data store and post of any unsaved, client-generated tags
                model.updateTags();

                model.destroyRecord().then(function () {
                    self.get('dropdown').closeDropdowns();
                    self.transitionToRoute('posts.index');
                    self.notifications.showSuccess('Your post has been deleted.', {delayed: true});
                }, function () {
                    self.notifications.showError('Your post could not be deleted. Please try again.');
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: 'Delete',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = DeletePostController;
  });
define("ghost/controllers/modals/delete-tag", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeleteTagController = Ember.Controller.extend({
        postInflection: Ember.computed('model.post_count', function () {
            return this.get('model.post_count') > 1 ? 'posts' : 'post';
        }),

        actions: {
            confirmAccept: function () {
                var tag = this.get('model'),
                    name = tag.get('name'),
                    self = this;

                this.send('closeSettingsMenu');

                tag.destroyRecord().then(function () {
                    self.notifications.showSuccess('Deleted ' + name);
                }).catch(function (error) {
                    self.notifications.showAPIError(error);
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: 'Delete',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = DeleteTagController;
  });
define("ghost/controllers/modals/delete-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DeleteUserController = Ember.Controller.extend({
        userPostCount: Ember.computed('model.id', function () {
            var promise,
                query = {
                    author: this.get('model.slug'),
                    status: 'all'
                };

            promise = this.store.find('post', query).then(function (results) {
                return results.meta.pagination.total;
            });

            return Ember.Object.extend(Ember.PromiseProxyMixin, {
                count: Ember.computed.alias('content'),

                inflection: Ember.computed('count', function () {
                    return this.get('count') > 1 ? 'posts' : 'post';
                })
            }).create({promise: promise});
        }),

        actions: {
            confirmAccept: function () {
                var self = this,
                    user = this.get('model');

                user.destroyRecord().then(function () {
                    self.store.unloadAll('post');
                    self.transitionToRoute('settings.users');
                    self.notifications.showSuccess('The user has been deleted.', {delayed: true});
                }, function () {
                    self.notifications.showError('The user could not be deleted. Please try again.');
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: 'Delete User',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = DeleteUserController;
  });
define("ghost/controllers/modals/invite-new-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var InviteNewUserController = Ember.Controller.extend({
        // Used to set the initial value for the dropdown
        authorRole: Ember.computed(function () {
            var self = this;

            return this.store.find('role').then(function (roles) {
                var authorRole = roles.findBy('name', 'Author');

                // Initialize role as well.
                self.set('role', authorRole);
                self.set('authorRole', authorRole);

                return authorRole;
            });
        }),

        confirm: {
            accept: {
                text: 'send invitation now'
            },
            reject: {
                buttonClass: 'hidden'
            }
        },

        actions: {
            setRole: function (role) {
                this.set('role', role);
            },

            confirmAccept: function () {
                var email = this.get('email'),
                    role = this.get('role'),
                    self = this,
                    newUser;

                // reset the form and close the modal
                self.set('email', '');
                self.set('role', self.get('authorRole'));
                self.send('closeModal');

                this.store.find('user').then(function (result) {
                    var invitedUser = result.findBy('email', email);

                    if (invitedUser) {
                        if (invitedUser.get('status') === 'invited' || invitedUser.get('status') === 'invited-pending') {
                            self.notifications.showWarn('A user with that email address was already invited.');
                        } else {
                            self.notifications.showWarn('A user with that email address already exists.');
                        }
                    } else {
                        newUser = self.store.createRecord('user', {
                            email: email,
                            status: 'invited',
                            role: role
                        });

                        newUser.save().then(function () {
                            var notificationText = 'Invitation sent! (' + email + ')';

                            // If sending the invitation email fails, the API will still return a status of 201
                            // but the user's status in the response object will be 'invited-pending'.
                            if (newUser.get('status') === 'invited-pending') {
                                self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                            } else {
                                self.notifications.showSuccess(notificationText);
                            }
                        }).catch(function (errors) {
                            newUser.deleteRecord();
                            self.notifications.showErrors(errors);
                        });
                    }
                });
            },

            confirmReject: function () {
                return false;
            }
        }
    });

    __exports__["default"] = InviteNewUserController;
  });
define("ghost/controllers/modals/leave-editor", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var LeaveEditorController = Ember.Controller.extend({
        args: Ember.computed.alias('model'),

        actions: {
            confirmAccept: function () {
                var args = this.get('args'),
                    editorController,
                    model,
                    transition;

                if (Ember.isArray(args)) {
                    editorController = args[0];
                    transition = args[1];
                    model = editorController.get('model');
                }

                if (!transition || !editorController) {
                    this.notifications.showError('Sorry, there was an error in the application. Please let the Ghost team know what happened.');

                    return true;
                }

                // definitely want to clear the data store and post of any unsaved, client-generated tags
                model.updateTags();

                if (model.get('isNew')) {
                    // the user doesn't want to save the new, unsaved post, so delete it.
                    model.deleteRecord();
                } else {
                    // roll back changes on model props
                    model.rollback();
                }

                // setting isDirty to false here allows willTransition on the editor route to succeed
                editorController.set('isDirty', false);

                // since the transition is now certain to complete, we can unset window.onbeforeunload here
                window.onbeforeunload = null;

                transition.retry();
            },

            confirmReject: function () {
            }
        },

        confirm: {
            accept: {
                text: 'Leave',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: 'Stay',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = LeaveEditorController;
  });
define("ghost/controllers/modals/signin", 
  ["ghost/controllers/signin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var SigninController = __dependency1__["default"];

    __exports__["default"] = SigninController.extend({
        needs: 'application',

        identification: Ember.computed('session.user.email', function () {
            return this.get('session.user.email');
        }),

        actions: {
            authenticate: function () {
                var appController = this.get('controllers.application'),
                    self = this;

                appController.set('skipAuthSuccessHandler', true);

                this._super().then(function () {
                    self.send('closeModal');
                    self.notifications.showSuccess('Login successful.');
                    self.set('password', '');
                }).finally(function () {
                    appController.set('skipAuthSuccessHandler', undefined);
                });
            },

            confirmAccept: function () {
                this.send('validateAndAuthenticate');
            }
        }
    });
  });
define("ghost/controllers/modals/transfer-owner", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var TransferOwnerController = Ember.Controller.extend({
        actions: {
            confirmAccept: function () {
                var user = this.get('model'),
                    url = this.get('ghostPaths.url').api('users', 'owner'),
                    self = this;

                self.get('dropdown').closeDropdowns();

                ic.ajax.request(url, {
                    type: 'PUT',
                    data: {
                        owner: [{
                            id: user.get('id')
                        }]
                    }
                }).then(function (response) {
                    // manually update the roles for the users that just changed roles
                    // because store.pushPayload is not working with embedded relations
                    if (response && Ember.isArray(response.users)) {
                        response.users.forEach(function (userJSON) {
                            var user = self.store.getById('user', userJSON.id),
                                role = self.store.getById('role', userJSON.roles[0].id);

                            user.set('role', role);
                        });
                    }

                    self.notifications.showSuccess('Ownership successfully transferred to ' + user.get('name'));
                }).catch(function (error) {
                    self.notifications.showAPIError(error);
                });
            },

            confirmReject: function () {
                return false;
            }
        },

        confirm: {
            accept: {
                text: 'Yep - I\'m sure',
                buttonClass: 'btn btn-red'
            },
            reject: {
                text: 'Cancel',
                buttonClass: 'btn btn-default btn-minor'
            }
        }
    });

    __exports__["default"] = TransferOwnerController;
  });
define("ghost/controllers/modals/upload", 
  ["exports"],
  function(__exports__) {
    "use strict";

    var UploadController = Ember.Controller.extend({
        acceptEncoding: 'image/*',
        actions: {
            confirmAccept: function () {
                var self = this;

                this.get('model').save().then(function (model) {
                    self.notifications.showSuccess('Saved');
                    return model;
                }).catch(function (err) {
                    self.notifications.showErrors(err);
                });
            },

            confirmReject: function () {
                return false;
            }
        }
    });

    __exports__["default"] = UploadController;
  });
define("ghost/controllers/post-settings-menu", 
  ["ghost/utils/date-formatting","ghost/mixins/settings-menu-controller","ghost/models/slug-generator","ghost/utils/bound-one-way","ghost/utils/isNumber","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    /* global moment */
    var parseDateString = __dependency1__.parseDateString;
    var formatDate = __dependency1__.formatDate;
    var SettingsMenuMixin = __dependency2__["default"];
    var SlugGenerator = __dependency3__["default"];
    var boundOneWay = __dependency4__["default"];
    var isNumber = __dependency5__["default"];

    var PostSettingsMenuController = Ember.Controller.extend(SettingsMenuMixin, {
        debounceId: null,
        lastPromise: null,
        selectedAuthor: null,
        uploaderReference: null,

        initializeSelectedAuthor: function () {
            var self = this;

            return this.get('model.author').then(function (author) {
                self.set('selectedAuthor', author);
                return author;
            });
        }.observes('model'),

        changeAuthor: function () {
            var author = this.get('model.author'),
                selectedAuthor = this.get('selectedAuthor'),
                model = this.get('model'),
                self = this;

            // return if nothing changed
            if (selectedAuthor.get('id') === author.get('id')) {
                return;
            }

            model.set('author', selectedAuthor);

            // if this is a new post (never been saved before), don't try to save it
            if (this.get('model.isNew')) {
                return;
            }

            model.save().catch(function (errors) {
                self.showErrors(errors);
                self.set('selectedAuthor', author);
                model.rollback();
            });
        }.observes('selectedAuthor'),

        authors: Ember.computed(function () {
            // Loaded asynchronously, so must use promise proxies.
            var deferred = {};

            deferred.promise = this.store.find('user', {limit: 'all'}).then(function (users) {
                return users.rejectBy('id', 'me').sortBy('name');
            }).then(function (users) {
                return users.filter(function (user) {
                    return user.get('active');
                });
            });

            return Ember.ArrayProxy
                .extend(Ember.PromiseProxyMixin)
                .create(deferred);
        }),

        /*jshint unused:false */
        publishedAtValue: Ember.computed('model.published_at', function (key, value) {
            var pubDate = this.get('model.published_at');

            // We're using a fake setter to reset
            // the cache for this property
            if (arguments.length > 1) {
                return formatDate(moment());
            }

            if (pubDate) {
                return formatDate(pubDate);
            }

            return formatDate(moment());
        }),
        /*jshint unused:true */

        slugValue: boundOneWay('model.slug'),

        // Lazy load the slug generator
        slugGenerator: Ember.computed(function () {
            return SlugGenerator.create({
                ghostPaths: this.get('ghostPaths'),
                slugType: 'post'
            });
        }),

        // Requests slug from title
        generateAndSetSlug: function (destination) {
            var self = this,
                title = this.get('model.titleScratch'),
                afterSave = this.get('lastPromise'),
                promise;

            // Only set an "untitled" slug once per post
            if (title === '(Untitled)' && this.get('model.slug')) {
                return;
            }

            promise = Ember.RSVP.resolve(afterSave).then(function () {
                return self.get('slugGenerator').generateSlug(title).then(function (slug) {
                    self.set(destination, slug);
                }).catch(function () {
                    // Nothing to do (would be nice to log this somewhere though),
                    // but a rejected promise needs to be handled here so that a resolved
                    // promise is returned.
                });
            });

            this.set('lastPromise', promise);
        },

        metaTitleScratch: boundOneWay('model.meta_title'),
        metaDescriptionScratch: boundOneWay('model.meta_description'),

        seoTitle: Ember.computed('model.titleScratch', 'metaTitleScratch', function () {
            var metaTitle = this.get('metaTitleScratch') || '';

            metaTitle = metaTitle.length > 0 ? metaTitle : this.get('model.titleScratch');

            if (metaTitle.length > 70) {
                metaTitle = metaTitle.substring(0, 70).trim();
                metaTitle = Ember.Handlebars.Utils.escapeExpression(metaTitle);
                metaTitle = new Ember.Handlebars.SafeString(metaTitle + '&hellip;');
            }

            return metaTitle;
        }),

        seoDescription: Ember.computed('model.scratch', 'metaDescriptionScratch', function () {
            var metaDescription = this.get('metaDescriptionScratch') || '',
                el,
                html = '',
                placeholder;

            if (metaDescription.length > 0) {
                placeholder = metaDescription;
            } else {
                el = $('.rendered-markdown');

                // Get rendered markdown
                if (el !== undefined && el.length > 0) {
                    html = el.clone();
                    html.find('.js-drop-zone').remove();
                    html = html[0].innerHTML;
                }

                // Strip HTML
                placeholder = $('<div />', {html: html}).text();
                // Replace new lines and trim
                // jscs: disable
                placeholder = placeholder.replace(/\n+/g, ' ').trim();
                // jscs: enable
            }

            if (placeholder.length > 156) {
                // Limit to 156 characters
                placeholder = placeholder.substring(0, 156).trim();
                placeholder = Ember.Handlebars.Utils.escapeExpression(placeholder);
                placeholder = new Ember.Handlebars.SafeString(placeholder + '&hellip;');
            }

            return placeholder;
        }),

        seoURL: Ember.computed('model.slug', function () {
            var blogUrl = this.get('config').blogUrl,
                seoSlug = this.get('model.slug') ? this.get('model.slug') : '',
                seoURL = blogUrl + '/' + seoSlug;

            // only append a slash to the URL if the slug exists
            if (seoSlug) {
                seoURL += '/';
            }

            if (seoURL.length > 70) {
                seoURL = seoURL.substring(0, 70).trim();
                seoURL = new Ember.Handlebars.SafeString(seoURL + '&hellip;');
            }

            return seoURL;
        }),

        // observe titleScratch, keeping the post's slug in sync
        // with it until saved for the first time.
        addTitleObserver: function () {
            if (this.get('model.isNew') || this.get('model.title') === '(Untitled)') {
                this.addObserver('model.titleScratch', this, 'titleObserver');
            }
        }.observes('model'),

        titleObserver: function () {
            var debounceId,
                title = this.get('model.title');

            // generate a slug if a post is new and doesn't have a title yet or
            // if the title is still '(Untitled)' and the slug is unaltered.
            if ((this.get('model.isNew') && !title) || title === '(Untitled)') {
                debounceId = Ember.run.debounce(this, 'generateAndSetSlug', ['slug'], 700);
            }

            this.set('debounceId', debounceId);
        },

        showErrors: function (errors) {
            errors = Ember.isArray(errors) ? errors : [errors];
            this.notifications.showErrors(errors);
        },

        showSuccess: function (message) {
            this.notifications.showSuccess(message);
        },

        actions: {
            togglePage: function () {
                var self = this;

                this.toggleProperty('model.page');
                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            toggleFeatured: function () {
                var self = this;

                this.toggleProperty('model.featured');

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save(this.get('saveOptions')).catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            /**
             * triggered by user manually changing slug
             */
            updateSlug: function (newSlug) {
                var slug = this.get('model.slug'),
                    self = this;

                newSlug = newSlug || slug;

                newSlug = newSlug && newSlug.trim();

                // Ignore unchanged slugs or candidate slugs that are empty
                if (!newSlug || slug === newSlug) {
                    // reset the input to its previous state
                    this.set('slugValue', slug);

                    return;
                }

                this.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
                    // If after getting the sanitized and unique slug back from the API
                    // we end up with a slug that matches the existing slug, abort the change
                    if (serverSlug === slug) {
                        return;
                    }

                    // Because the server transforms the candidate slug by stripping
                    // certain characters and appending a number onto the end of slugs
                    // to enforce uniqueness, there are cases where we can get back a
                    // candidate slug that is a duplicate of the original except for
                    // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                    // get the last token out of the slug candidate and see if it's a number
                    var slugTokens = serverSlug.split('-'),
                        check = Number(slugTokens.pop());

                    // if the candidate slug is the same as the existing slug except
                    // for the incrementor then the existing slug should be used
                    if (isNumber(check) && check > 0) {
                        if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                            self.set('slugValue', slug);

                            return;
                        }
                    }

                    self.set('model.slug', serverSlug);

                    if (self.hasObserverFor('model.titleScratch')) {
                        self.removeObserver('model.titleScratch', self, 'titleObserver');
                    }

                    // If this is a new post.  Don't save the model.  Defer the save
                    // to the user pressing the save button
                    if (self.get('model.isNew')) {
                        return;
                    }

                    return self.get('model').save();
                }).catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            /**
             * Parse user's set published date.
             * Action sent by post settings menu view.
             * (#1351)
             */
            setPublishedAt: function (userInput) {
                var errMessage = '',
                    newPublishedAt = parseDateString(userInput),
                    publishedAt = this.get('model.published_at'),
                    self = this;

                if (!userInput) {
                    // Clear out the published_at field for a draft
                    if (this.get('model.isDraft')) {
                        this.set('model.published_at', null);
                    }

                    return;
                }

                // Validate new Published date
                if (!newPublishedAt.isValid()) {
                    errMessage = 'Published Date must be a valid date with format: ' +
                        'DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)';
                }
                if (newPublishedAt.diff(new Date(), 'h') > 0) {
                    errMessage = 'Published Date cannot currently be in the future.';
                }

                // If errors, notify and exit.
                if (errMessage) {
                    this.showErrors(errMessage);

                    return;
                }

                // Do nothing if the user didn't actually change the date
                if (publishedAt && publishedAt.isSame(newPublishedAt)) {
                    return;
                }

                // Validation complete
                this.set('model.published_at', newPublishedAt);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            setMetaTitle: function (metaTitle) {
                var self = this,
                    currentTitle = this.get('model.meta_title') || '';

                // Only update if the title has changed
                if (currentTitle === metaTitle) {
                    return;
                }

                this.set('model.meta_title', metaTitle);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch(function (errors) {
                    self.showErrors(errors);
                });
            },

            setMetaDescription: function (metaDescription) {
                var self = this,
                    currentDescription = this.get('model.meta_description') || '';

                // Only update if the description has changed
                if (currentDescription === metaDescription) {
                    return;
                }

                this.set('model.meta_description', metaDescription);

                // If this is a new post.  Don't save the model.  Defer the save
                // to the user pressing the save button
                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch(function (errors) {
                    self.showErrors(errors);
                });
            },

            setCoverImage: function (image) {
                var self = this;

                this.set('model.image', image);

                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            clearCoverImage: function () {
                var self = this;

                this.set('model.image', '');

                if (this.get('model.isNew')) {
                    return;
                }

                this.get('model').save().catch(function (errors) {
                    self.showErrors(errors);
                    self.get('model').rollback();
                });
            },

            resetUploader: function () {
                var uploader = this.get('uploaderReference');

                if (uploader && uploader[0]) {
                    uploader[0].uploaderUi.reset();
                }
            },

            resetPubDate: function () {
                this.set('publishedAtValue', '');
            }
        }
    });

    __exports__["default"] = PostSettingsMenuController;
  });
define("ghost/controllers/post-tags-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostTagsInputController = Ember.Controller.extend({
        tagEnteredOrder: Ember.A(),

        tags: Ember.computed('parentController.model.tags', function () {
            var proxyTags = Ember.ArrayProxy.create({
                content: this.get('parentController.model.tags')
            }),
            temp = proxyTags.get('arrangedContent').slice();

            proxyTags.get('arrangedContent').clear();

            this.get('tagEnteredOrder').forEach(function (tagName) {
                var tag = temp.find(function (tag) {
                    return tag.get('name') === tagName;
                });

                if (tag) {
                    proxyTags.get('arrangedContent').addObject(tag);
                    temp.removeObject(tag);
                }
            });

            proxyTags.get('arrangedContent').unshiftObjects(temp);

            return proxyTags;
        }),

        suggestions: null,
        newTagText: null,

        actions: {
            // triggered when the view is inserted so that later store.all('tag')
            // queries hit a full store cache and we don't see empty or out-of-date
            // suggestion lists
            loadAllTags: function () {
                this.store.find('tag', {limit: 'all'});
            },

            addNewTag: function () {
                var newTagText = this.get('newTagText'),
                    searchTerm,
                    existingTags,
                    newTag;

                if (Ember.isEmpty(newTagText) || this.hasTag(newTagText)) {
                    this.send('reset');
                    return;
                }

                newTagText = newTagText.trim();
                searchTerm = newTagText.toLowerCase();

                // add existing tag if we have a match
                existingTags = this.store.all('tag').filter(function (tag) {
                    if (tag.get('isNew')) {
                        return false;
                    }

                    return tag.get('name').toLowerCase() === searchTerm;
                });

                if (existingTags.get('length')) {
                    this.send('addTag', existingTags.get('firstObject'));
                } else {
                    // otherwise create a new one
                    newTag = this.store.createRecord('tag');
                    newTag.set('name', newTagText);

                    this.send('addTag', newTag);
                }

                this.send('reset');
            },

            addTag: function (tag) {
                if (!Ember.isEmpty(tag)) {
                    this.get('tags').addObject(tag);
                    this.get('tagEnteredOrder').addObject(tag.get('name'));
                }

                this.send('reset');
            },

            deleteTag: function (tag) {
                if (tag) {
                    this.get('tags').removeObject(tag);
                    this.get('tagEnteredOrder').removeObject(tag.get('name'));
                }
            },

            deleteLastTag: function () {
                this.send('deleteTag', this.get('tags.lastObject'));
            },

            selectSuggestion: function (suggestion) {
                if (!Ember.isEmpty(suggestion)) {
                    this.get('suggestions').setEach('selected', false);
                    suggestion.set('selected', true);
                }
            },

            selectNextSuggestion: function () {
                var suggestions = this.get('suggestions'),
                    selectedSuggestion = this.get('selectedSuggestion'),
                    currentIndex,
                    newSelection;

                if (!Ember.isEmpty(suggestions)) {
                    currentIndex = suggestions.indexOf(selectedSuggestion);
                    if (currentIndex + 1 < suggestions.get('length')) {
                        newSelection = suggestions[currentIndex + 1];
                        this.send('selectSuggestion', newSelection);
                    } else {
                        suggestions.setEach('selected', false);
                    }
                }
            },

            selectPreviousSuggestion: function () {
                var suggestions = this.get('suggestions'),
                    selectedSuggestion = this.get('selectedSuggestion'),
                    currentIndex,
                    lastIndex,
                    newSelection;

                if (!Ember.isEmpty(suggestions)) {
                    currentIndex = suggestions.indexOf(selectedSuggestion);
                    if (currentIndex === -1) {
                        lastIndex = suggestions.get('length') - 1;
                        this.send('selectSuggestion', suggestions[lastIndex]);
                    } else if (currentIndex - 1 >= 0) {
                        newSelection = suggestions[currentIndex - 1];
                        this.send('selectSuggestion', newSelection);
                    } else {
                        suggestions.setEach('selected', false);
                    }
                }
            },

            addSelectedSuggestion: function () {
                var suggestion = this.get('selectedSuggestion');

                if (Ember.isEmpty(suggestion)) {
                    return;
                }

                this.send('addTag', suggestion.get('tag'));
            },

            reset: function () {
                this.set('suggestions', null);
                this.set('newTagText', null);
            }
        },

        selectedSuggestion: Ember.computed('suggestions.@each.selected', function () {
            var suggestions = this.get('suggestions');

            if (suggestions && suggestions.get('length')) {
                return suggestions.filterBy('selected').get('firstObject');
            } else {
                return null;
            }
        }),

        updateSuggestionsList: function () {
            var searchTerm = this.get('newTagText'),
                matchingTags,
                // Limit the suggestions number
                maxSuggestions = 5,
                suggestions = Ember.A();

            if (!searchTerm || Ember.isEmpty(searchTerm.trim())) {
                this.set('suggestions', null);
                return;
            }

            searchTerm = searchTerm.trim();

            matchingTags = this.findMatchingTags(searchTerm);
            matchingTags = matchingTags.slice(0, maxSuggestions);
            matchingTags.forEach(function (matchingTag) {
                var suggestion = this.makeSuggestionObject(matchingTag, searchTerm);
                suggestions.pushObject(suggestion);
            }, this);

            this.set('suggestions', suggestions);
        }.observes('newTagText'),

        findMatchingTags: function (searchTerm) {
            var matchingTags,
                self = this,
                allTags = this.store.all('tag').filterBy('isNew', false),
                deDupe = {};

            if (allTags.get('length') === 0) {
                return [];
            }

            searchTerm = searchTerm.toLowerCase();

            matchingTags = allTags.filter(function (tag) {
                var tagNameMatches,
                    hasAlreadyBeenAdded,
                    tagName = tag.get('name');

                tagNameMatches = tagName.toLowerCase().indexOf(searchTerm) !== -1;
                hasAlreadyBeenAdded = self.hasTag(tagName);

                if (tagNameMatches && !hasAlreadyBeenAdded) {
                    if (typeof deDupe[tagName] === 'undefined') {
                        deDupe[tagName] = 1;
                    } else {
                        deDupe[tagName] += 1;
                    }
                }

                return deDupe[tagName] === 1;
            });

            return matchingTags;
        },

        hasTag: function (tagName) {
            return this.get('tags').mapBy('name').contains(tagName);
        },

        makeSuggestionObject: function (matchingTag, _searchTerm) {
            var searchTerm = Ember.Handlebars.Utils.escapeExpression(_searchTerm),
                // jscs:disable
                regexEscapedSearchTerm = searchTerm.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'),
                // jscs:enable
                tagName = Ember.Handlebars.Utils.escapeExpression(matchingTag.get('name')),
                regex = new RegExp('(' + regexEscapedSearchTerm + ')', 'gi'),
                highlightedName,
                suggestion = Ember.Object.create();

            highlightedName = tagName.replace(regex, '<mark>$1</mark>');
            highlightedName = new Ember.Handlebars.SafeString(highlightedName);

            suggestion.set('tag', matchingTag);
            suggestion.set('highlightedName', highlightedName);

            return suggestion;
        }
    });

    __exports__["default"] = PostTagsInputController;
  });
define("ghost/controllers/posts", 
  ["ghost/mixins/pagination-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var PaginationControllerMixin = __dependency1__["default"];

    function publishedAtCompare(item1, item2) {
        var published1 = item1.get('published_at'),
            published2 = item2.get('published_at');

        if (!published1 && !published2) {
            return 0;
        }

        if (!published1 && published2) {
            return -1;
        }

        if (!published2 && published1) {
            return 1;
        }

        return Ember.compare(published1.valueOf(), published2.valueOf());
    }

    var PostsController = Ember.ArrayController.extend(PaginationControllerMixin, {
        // See PostsRoute's shortcuts
        postListFocused: Ember.computed.equal('keyboardFocus', 'postList'),
        postContentFocused: Ember.computed.equal('keyboardFocus', 'postContent'),
        // this will cause the list to re-sort when any of these properties change on any of the models
        sortProperties: ['status', 'published_at', 'updated_at'],

        // override Ember.SortableMixin
        //
        // this function will keep the posts list sorted when loading individual/bulk
        // models from the server, even if records in between haven't been loaded.
        // this can happen when reloading the page on the Editor or PostsPost routes.
        //
        // a custom sort function is needed in order to sort the posts list the same way the server would:
        //     status: ASC
        //     published_at: DESC
        //     updated_at: DESC
        //     id: DESC
        orderBy: function (item1, item2) {
            var updated1 = item1.get('updated_at'),
                updated2 = item2.get('updated_at'),
                idResult,
                statusResult,
                updatedAtResult,
                publishedAtResult;

            // when `updated_at` is undefined, the model is still
            // being written to with the results from the server
            if (item1.get('isNew') || !updated1) {
                return -1;
            }

            if (item2.get('isNew') || !updated2) {
                return 1;
            }

            idResult = Ember.compare(parseInt(item1.get('id')), parseInt(item2.get('id')));
            statusResult = Ember.compare(item1.get('status'), item2.get('status'));
            updatedAtResult = Ember.compare(updated1.valueOf(), updated2.valueOf());
            publishedAtResult = publishedAtCompare(item1, item2);

            if (statusResult === 0) {
                if (publishedAtResult === 0) {
                    if (updatedAtResult === 0) {
                        // This should be DESC
                        return idResult * -1;
                    }
                    // This should be DESC
                    return updatedAtResult * -1;
                }
                // This should be DESC
                return publishedAtResult * -1;
            }

            return statusResult;
        },

        init: function () {
            // let the PaginationControllerMixin know what type of model we will be paginating
            // this is necesariy because we do not have access to the model inside the Controller::init method
            this._super({modelType: 'post'});
        }
    });

    __exports__["default"] = PostsController;
  });
define("ghost/controllers/posts/post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostController = Ember.Controller.extend({
        isPublished: Ember.computed.equal('model.status', 'published'),
        classNameBindings: ['model.featured'],

        actions: {
            toggleFeatured: function () {
                var options = {disableNProgress: true},
                    self = this;

                this.toggleProperty('model.featured');
                this.get('model').save(options).catch(function (errors) {
                    self.notifications.showErrors(errors);
                });
            },
            showPostContent: function () {
                this.transitionToRoute('posts.post', this.get('model'));
            }
        }
    });

    __exports__["default"] = PostController;
  });
define("ghost/controllers/reset", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];

    var ValidationEngine = __dependency2__["default"];

    
    var ResetController = Ember.Controller.extend(ValidationEngine, {
        newPassword: '',
        ne2Password: '',
        token: '',
        submitButtonDisabled: false,
    
        validationType: 'reset',
    
        email: Ember.computed('token', function () {
            // The token base64 encodes the email (and some other stuff),
            // each section is divided by a '|'. Email comes second.
            return atob(this.get('token')).split('|')[1];
        }),
    
        // Used to clear sensitive information
        clearData: function () {
            this.setProperties({
                newPassword: '',
                ne2Password: '',
                token: ''
            });
        },
    
        actions: {
            submit: function () {
                var credentials = this.getProperties('newPassword', 'ne2Password', 'token'),
                    self = this;
    
                this.toggleProperty('submitting');
                this.validate({format: false}).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                        type: 'PUT',
                        data: {
                            passwordreset: [credentials]
                        }
                    }).then(function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showSuccess(resp.passwordreset[0].message, true);
                        self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                            identification: self.get('email'),
                            password: credentials.newPassword
                        });
                    }).catch(function (response) {
                        self.notifications.showAPIError(response);
                        self.toggleProperty('submitting');
                    });
                }).catch(function (error) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(error);
                });
            }
        }
    });
    
    __exports__["default"] = ResetController;
  });
define("ghost/controllers/settings", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsController = Ember.Controller.extend({
        needs: ['feature'],

        showGeneral: Ember.computed('session.user.name', function () {
            return this.get('session.user.isAuthor') || this.get('session.user.isEditor') ? false : true;
        }),
        showUsers: Ember.computed('session.user.name', function () {
            return this.get('session.user.isAuthor') ? false : true;
        }),
        showTags: Ember.computed('session.user.name', 'controllers.feature.tagsUI', function () {
            return this.get('session.user.isAuthor') || !this.get('controllers.feature.tagsUI') ? false : true;
        }),
        showCodeInjection: Ember.computed('session.user.name', 'controllers.feature.codeInjectionUI', function () {
            return this.get('session.user.isAuthor') || this.get('session.user.isEditor') || !this.get('controllers.feature.codeInjectionUI') ? false : true;
        }),
        showLabs: Ember.computed('session.user.name', function () {
            return this.get('session.user.isAuthor')  || this.get('session.user.isEditor') ? false : true;
        }),
        showAbout: Ember.computed('session.user.name', function () {
            return this.get('session.user.isAuthor') ? false : true;
        })
    });

    __exports__["default"] = SettingsController;
  });
define("ghost/controllers/settings/app", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global alert */

    var appStates,
        SettingsAppController;

    appStates = {
        active: 'active',
        working: 'working',
        inactive: 'inactive'
    };

    SettingsAppController = Ember.Controller.extend({
        appState: appStates.active,
        buttonText: '',

        setAppState: function () {
            this.set('appState', this.get('active') ? appStates.active : appStates.inactive);
        }.on('init'),

        buttonTextSetter: function () {
            switch (this.get('appState')) {
                case appStates.active:
                    this.set('buttonText', 'Deactivate');
                    break;
                case appStates.inactive:
                    this.set('buttonText', 'Activate');
                    break;
                case appStates.working:
                    this.set('buttonText', 'Working');
                    break;
            }
        }.observes('appState').on('init'),

        activeClass: Ember.computed('appState', function () {
            return this.appState === appStates.active ? true : false;
        }),

        inactiveClass: Ember.computed('appState', function () {
            return this.appState === appStates.inactive ? true : false;
        }),

        actions: {
            toggleApp: function (app) {
                var self = this;

                this.set('appState', appStates.working);

                app.set('active', !app.get('active'));

                app.save().then(function () {
                    self.setAppState();
                })
                .then(function () {
                    alert('@TODO: Success');
                })
                .catch(function () {
                    alert('@TODO: Failure');
                });
            }
        }
    });

    __exports__["default"] = SettingsAppController;
  });
define("ghost/controllers/settings/code-injection", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsCodeInjectionController = Ember.Controller.extend({
        actions: {
            save: function () {
                var self = this;

                return this.get('model').save().then(function (model) {
                    self.notifications.closePassive();
                    self.notifications.showSuccess('Settings successfully saved.');

                    return model;
                }).catch(function (errors) {
                    self.notifications.closePassive();
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SettingsCodeInjectionController;
  });
define("ghost/controllers/settings/general", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsGeneralController = Ember.Controller.extend({
        selectedTheme: null,

        isDatedPermalinks: Ember.computed('model.permalinks', function (key, value) {
            // setter
            if (arguments.length > 1) {
                this.set('model.permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');
            }

            // getter
            var slugForm = this.get('model.permalinks');

            return slugForm !== '/:slug/';
        }),

        themes: Ember.computed(function () {
            return this.get('model.availableThemes').reduce(function (themes, t) {
                var theme = {};

                theme.name = t.name;
                theme.label = t.package ? t.package.name + ' - ' + t.package.version : t.name;
                theme.package = t.package;
                theme.active = !!t.active;

                themes.push(theme);

                return themes;
            }, []);
        }).readOnly(),

        actions: {
            save: function () {
                var self = this;

                return this.get('model').save().then(function (model) {
                    self.notifications.showSuccess('Settings successfully saved.');

                    return model;
                }).catch(function (errors) {
                    self.notifications.showErrors(errors);
                });
            },

            checkPostsPerPage: function () {
                var postsPerPage = this.get('model.postsPerPage');

                if (postsPerPage < 1 || postsPerPage > 1000 || isNaN(postsPerPage)) {
                    this.set('model.postsPerPage', 5);
                }
            }
        }
    });

    __exports__["default"] = SettingsGeneralController;
  });
define("ghost/controllers/settings/labs", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var LabsController = Ember.Controller.extend(Ember.Evented, {
        needs: ['feature'],

        uploadButtonText: 'Import',
        importErrors: '',
        labsJSON: Ember.computed('model.labs', function () {
            return JSON.parse(this.get('model.labs') || {});
        }),

        saveLabs: function (optionName, optionValue) {
            var self = this,
                labsJSON =  this.get('labsJSON');

            // Set new value in the JSON object
            labsJSON[optionName] = optionValue;

            this.set('model.labs', JSON.stringify(labsJSON));

            this.get('model').save().catch(function (errors) {
                self.showErrors(errors);
                self.get('model').rollback();
            });
        },

        tagsUIFlag: Ember.computed.alias('config.tagsUI'),
        codeUIFlag: Ember.computed.alias('config.codeInjectionUI'),

        useTagsUI: Ember.computed('controllers.feature.tagsUI', function (key, value) {
            // setter
            if (arguments.length > 1) {
                this.saveLabs('tagsUI', value);
            }

            // getter
            return this.get('controllers.feature.tagsUI') || false;
        }),

        useCodeInjectionUI: Ember.computed('controllers.feature.tagsUI', function (key, value) {
            // setter
            if (arguments.length > 1) {
                this.saveLabs('codeInjectionUI', value);
            }

            // getter
            return this.get('controllers.feature.codeInjectionUI') || false;
        }),

        actions: {
            onUpload: function (file) {
                var self = this,
                    formData = new FormData();

                this.set('uploadButtonText', 'Importing');
                this.set('importErrors', '');
                this.notifications.closePassive();

                formData.append('importfile', file);

                ic.ajax.request(this.get('ghostPaths.url').api('db'), {
                    type: 'POST',
                    data: formData,
                    dataType: 'json',
                    cache: false,
                    contentType: false,
                    processData: false
                }).then(function () {
                    self.notifications.showSuccess('Import successful.');
                }).catch(function (response) {
                    if (response && response.jqXHR && response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
                        self.set('importErrors', response.jqXHR.responseJSON.errors);
                    }

                    self.notifications.showError('Import Failed');
                }).finally(function () {
                    self.set('uploadButtonText', 'Import');
                    self.trigger('reset');
                });
            },

            exportData: function () {
                var iframe = $('#iframeDownload'),
                    downloadURL = this.get('ghostPaths.url').api('db') +
                        '?access_token=' + this.get('session.access_token');

                if (iframe.length === 0) {
                    iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
                }

                iframe.attr('src', downloadURL);
            },

            sendTestEmail: function () {
                var self = this;

                ic.ajax.request(this.get('ghostPaths.url').api('mail', 'test'), {
                    type: 'POST'
                }).then(function () {
                    self.notifications.showSuccess('Check your email for the test message.');
                }).catch(function (error) {
                    if (typeof error.jqXHR !== 'undefined') {
                        self.notifications.showAPIError(error);
                    } else {
                        self.notifications.showErrors(error);
                    }
                });
            }
        }
    });

    __exports__["default"] = LabsController;
  });
define("ghost/controllers/settings/tags", 
  ["ghost/mixins/pagination-controller","ghost/mixins/settings-menu-controller","ghost/utils/bound-one-way","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var PaginationMixin = __dependency1__["default"];
    var SettingsMenuMixin = __dependency2__["default"];
    var boundOneWay = __dependency3__["default"];

    var TagsController = Ember.ArrayController.extend(PaginationMixin, SettingsMenuMixin, {
        tags: Ember.computed.alias('model'),

        activeTag: null,
        activeTagNameScratch: boundOneWay('activeTag.name'),
        activeTagSlugScratch: boundOneWay('activeTag.slug'),
        activeTagDescriptionScratch: boundOneWay('activeTag.description'),
        activeTagMetaTitleScratch: boundOneWay('activeTag.meta_title'),
        activeTagMetaDescriptionScratch: boundOneWay('activeTag.meta_description'),

        init: function (options) {
            options = options || {};
            options.modelType = 'tag';
            this._super(options);
        },

        showErrors: function (errors) {
            errors = Ember.isArray(errors) ? errors : [errors];
            this.notifications.showErrors(errors);
        },

        saveActiveTagProperty: function (propKey, newValue) {
            var activeTag = this.get('activeTag'),
                currentValue = activeTag.get(propKey),
                self = this;

            newValue = newValue.trim();

            // Quit if there was no change
            if (newValue === currentValue) {
                return;
            }

            activeTag.set(propKey, newValue);

            this.notifications.closePassive();

            activeTag.save().catch(function (errors) {
                self.showErrors(errors);
            });
        },

        seoTitle: Ember.computed('scratch', 'activeTagNameScratch', 'activeTagMetaTitleScratch', function () {
            var metaTitle = this.get('activeTagMetaTitleScratch') || '';

            metaTitle = metaTitle.length > 0 ? metaTitle : this.get('activeTagNameScratch');

            if (metaTitle && metaTitle.length > 70) {
                metaTitle = metaTitle.substring(0, 70).trim();
                metaTitle = Ember.Handlebars.Utils.escapeExpression(metaTitle);
                metaTitle = new Ember.Handlebars.SafeString(metaTitle + '&hellip;');
            }

            return metaTitle;
        }),

        seoURL: Ember.computed('activeTagSlugScratch', function () {
            var blogUrl = this.get('config').blogUrl,
                seoSlug = this.get('activeTagSlugScratch') ? this.get('activeTagSlugScratch') : '',
                seoURL = blogUrl + '/tag/' + seoSlug;

            // only append a slash to the URL if the slug exists
            if (seoSlug) {
                seoURL += '/';
            }

            if (seoURL.length > 70) {
                seoURL = seoURL.substring(0, 70).trim();
                seoURL = new Ember.Handlebars.SafeString(seoURL + '&hellip;');
            }

            return seoURL;
        }),

        seoDescription: Ember.computed('scratch', 'activeTagDescriptionScratch', 'activeTagMetaDescriptionScratch', function () {
            var metaDescription = this.get('activeTagMetaDescriptionScratch') || '';

            metaDescription = metaDescription.length > 0 ? metaDescription : this.get('activeTagDescriptionScratch');

            if (metaDescription && metaDescription.length > 156) {
                metaDescription = metaDescription.substring(0, 156).trim();
                metaDescription = Ember.Handlebars.Utils.escapeExpression(metaDescription);
                metaDescription = new Ember.Handlebars.SafeString(metaDescription + '&hellip;');
            }

            return metaDescription;
        }),

        actions: {
            newTag: function () {
                this.set('activeTag', this.store.createRecord('tag', {post_count: 0}));
                this.send('openSettingsMenu');
            },

            editTag: function (tag) {
                this.set('activeTag', tag);
                this.send('openSettingsMenu');
            },

            saveActiveTagName: function (name) {
                this.saveActiveTagProperty('name', name);
            },

            saveActiveTagSlug: function (slug) {
                this.saveActiveTagProperty('slug', slug);
            },

            saveActiveTagDescription: function (description) {
                this.saveActiveTagProperty('description', description);
            },

            saveActiveTagMetaTitle: function (metaTitle) {
                this.saveActiveTagProperty('meta_title', metaTitle);
            },

            saveActiveTagMetaDescription: function (metaDescription) {
                this.saveActiveTagProperty('meta_description', metaDescription);
            },

            setCoverImage: function (image) {
                this.saveActiveTagProperty('image', image);
            },

            clearCoverImage: function () {
                this.saveActiveTagProperty('image', '');
            }
        }
    });

    __exports__["default"] = TagsController;
  });
define("ghost/controllers/settings/users/index", 
  ["ghost/mixins/pagination-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var PaginationControllerMixin = __dependency1__["default"];

    var UsersIndexController = Ember.ArrayController.extend(PaginationControllerMixin, {
        init: function () {
            // let the PaginationControllerMixin know what type of model we will be paginating
            // this is necessary because we do not have access to the model inside the Controller::init method
            this._super({modelType: 'user'});
        },

        users: Ember.computed.alias('model'),

        activeUsers: Ember.computed.filter('users', function (user) {
            return /^active|warn-[1-4]|locked$/.test(user.get('status'));
        }),

        invitedUsers: Ember.computed.filter('users', function (user) {
            var status = user.get('status');

            return status === 'invited' || status === 'invited-pending';
        })
    });

    __exports__["default"] = UsersIndexController;
  });
define("ghost/controllers/settings/users/user", 
  ["ghost/models/slug-generator","ghost/utils/isNumber","ghost/utils/bound-one-way","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var SlugGenerator = __dependency1__["default"];
    var isNumber = __dependency2__["default"];
    var boundOneWay = __dependency3__["default"];

    var SettingsUserController = Ember.Controller.extend({

        user: Ember.computed.alias('model'),

        email: Ember.computed.readOnly('model.email'),

        slugValue: boundOneWay('model.slug'),

        lastPromise: null,

        coverDefault: Ember.computed('ghostPaths', function () {
            return this.get('ghostPaths.url').asset('/shared/img/user-cover.png');
        }),

        userDefault: Ember.computed('ghostPaths', function () {
            return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
        }),

        cover: Ember.computed('user.cover', 'coverDefault', function () {
            var cover = this.get('user.cover');

            if (Ember.isBlank(cover)) {
                cover = this.get('coverDefault');
            }

            return 'background-image: url(' + cover + ')';
        }),

        coverTitle: Ember.computed('user.name', function () {
            return this.get('user.name') + '\'s Cover Image';
        }),

        image: Ember.computed('imageUrl', function () {
            return 'background-image: url(' + this.get('imageUrl') + ')';
        }),

        imageUrl: Ember.computed('user.image', function () {
            return this.get('user.image') || this.get('userDefault');
        }),

        last_login: Ember.computed('user.last_login', function () {
            var lastLogin = this.get('user.last_login');

            return lastLogin ? lastLogin.fromNow() : '(Never)';
        }),

        created_at: Ember.computed('user.created_at', function () {
            var createdAt = this.get('user.created_at');

            return createdAt ? createdAt.fromNow() : '';
        }),

        // Lazy load the slug generator for slugPlaceholder
        slugGenerator: Ember.computed(function () {
            return SlugGenerator.create({
                ghostPaths: this.get('ghostPaths'),
                slugType: 'user'
            });
        }),

        actions: {
            changeRole: function (newRole) {
                this.set('model.role', newRole);
            },

            revoke: function () {
                var self = this,
                    model = this.get('model'),
                    email = this.get('email');

                // reload the model to get the most up-to-date user information
                model.reload().then(function () {
                    if (model.get('invited')) {
                        model.destroyRecord().then(function () {
                            var notificationText = 'Invitation revoked. (' + email + ')';
                            self.notifications.showSuccess(notificationText, false);
                        }).catch(function (error) {
                            self.notifications.showAPIError(error);
                        });
                    } else {
                        // if the user is no longer marked as "invited", then show a warning and reload the route
                        self.get('target').send('reload');
                        self.notifications.showError('This user has already accepted the invitation.', {delayed: 500});
                    }
                });
            },

            resend: function () {
                var self = this;

                this.get('model').resendInvite().then(function (result) {
                    var notificationText = 'Invitation resent! (' + self.get('email') + ')';
                    // If sending the invitation email fails, the API will still return a status of 201
                    // but the user's status in the response object will be 'invited-pending'.
                    if (result.users[0].status === 'invited-pending') {
                        self.notifications.showWarn('Invitation email was not sent.  Please try resending.');
                    } else {
                        self.get('model').set('status', result.users[0].status);
                        self.notifications.showSuccess(notificationText);
                    }
                }).catch(function (error) {
                    self.notifications.showAPIError(error);
                });
            },

            save: function () {
                var user = this.get('user'),
                    slugValue = this.get('slugValue'),
                    afterUpdateSlug = this.get('lastPromise'),
                    promise,
                    slugChanged,
                    self = this;

                if (user.get('slug') !== slugValue) {
                    slugChanged = true;
                    user.set('slug', slugValue);
                }

                promise = Ember.RSVP.resolve(afterUpdateSlug).then(function () {
                    return user.save({format: false});
                }).then(function (model) {
                    var currentPath,
                        newPath;

                    self.notifications.showSuccess('Settings successfully saved.');

                    // If the user's slug has changed, change the URL and replace
                    // the history so refresh and back button still work
                    if (slugChanged) {
                        currentPath = window.history.state.path;

                        newPath = currentPath.split('/');
                        newPath[newPath.length - 2] = model.get('slug');
                        newPath = newPath.join('/');

                        window.history.replaceState({path: newPath}, '', newPath);
                    }

                    return model;
                }).catch(function (errors) {
                    self.notifications.showErrors(errors);
                });

                this.set('lastPromise', promise);
            },

            password: function () {
                var user = this.get('user'),
                    self = this;

                if (user.get('isPasswordValid')) {
                    user.saveNewPassword().then(function (model) {
                        // Clear properties from view
                        user.setProperties({
                            password: '',
                            newPassword: '',
                            ne2Password: ''
                        });

                        self.notifications.showSuccess('Password updated.');

                        return model;
                    }).catch(function (errors) {
                        self.notifications.showAPIError(errors);
                    });
                } else {
                    self.notifications.showErrors(user.get('passwordValidationErrors'));
                }
            },

            updateSlug: function (newSlug) {
                var self = this,
                    afterSave = this.get('lastPromise'),
                    promise;

                promise = Ember.RSVP.resolve(afterSave).then(function () {
                    var slug = self.get('model.slug');

                    newSlug = newSlug || slug;

                    newSlug = newSlug.trim();

                    // Ignore unchanged slugs or candidate slugs that are empty
                    if (!newSlug || slug === newSlug) {
                        self.set('slugValue', slug);

                        return;
                    }

                    return self.get('slugGenerator').generateSlug(newSlug).then(function (serverSlug) {
                        // If after getting the sanitized and unique slug back from the API
                        // we end up with a slug that matches the existing slug, abort the change
                        if (serverSlug === slug) {
                            return;
                        }

                        // Because the server transforms the candidate slug by stripping
                        // certain characters and appending a number onto the end of slugs
                        // to enforce uniqueness, there are cases where we can get back a
                        // candidate slug that is a duplicate of the original except for
                        // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

                        // get the last token out of the slug candidate and see if it's a number
                        var slugTokens = serverSlug.split('-'),
                            check = Number(slugTokens.pop());

                        // if the candidate slug is the same as the existing slug except
                        // for the incrementor then the existing slug should be used
                        if (isNumber(check) && check > 0) {
                            if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                                self.set('slugValue', slug);

                                return;
                            }
                        }

                        self.set('slugValue', serverSlug);
                    });
                });

                this.set('lastPromise', promise);
            }
        }
    });

    __exports__["default"] = SettingsUserController;
  });
define("ghost/controllers/setup", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];
    var ValidationEngine = __dependency2__["default"];

    var SetupController = Ember.Controller.extend(ValidationEngine, {
        blogTitle: null,
        name: null,
        email: null,
        password: null,
        submitting: false,

        // ValidationEngine settings
        validationType: 'setup',

        actions: {
            setup: function () {
                var self = this,
                    data = self.getProperties('blogTitle', 'name', 'email', 'password');

                self.notifications.closePassive();

                this.toggleProperty('submitting');
                this.validate({format: false}).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'setup'),
                        type: 'POST',
                        data: {
                            setup: [{
                                name: data.name,
                                email: data.email,
                                password: data.password,
                                blogTitle: data.blogTitle
                            }]
                        }
                    }).then(function () {
                        self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                            identification: self.get('email'),
                            password: self.get('password')
                        });
                    }).catch(function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showAPIError(resp);
                    });
                }).catch(function (errors) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SetupController;
  });
define("ghost/controllers/signin", 
  ["ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];

    var SigninController = Ember.Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine, {
        authenticator: 'simple-auth-authenticator:oauth2-password-grant',

        validationType: 'signin',

        actions: {
            authenticate: function () {
                var data = this.getProperties('identification', 'password');

                this._super(data).catch(function () {
                    // If simple-auth's authenticate rejects we need to catch it
                    // to avoid an unhandled rejection exception.
                });
            },

            validateAndAuthenticate: function () {
                var self = this;

                // Manually trigger events for input fields, ensuring legacy compatibility with
                // browsers and password managers that don't send proper events on autofill
                $('#login').find('input').trigger('change');

                this.validate({format: false}).then(function () {
                    self.notifications.closePassive();
                    self.send('authenticate');
                }).catch(function (errors) {
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SigninController;
  });
define("ghost/controllers/signup", 
  ["ghost/utils/ajax","ghost/mixins/validation-engine","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ajax = __dependency1__["default"];
    var ValidationEngine = __dependency2__["default"];

    var SignupController = Ember.Controller.extend(ValidationEngine, {
        submitting: false,

        // ValidationEngine settings
        validationType: 'signup',

        actions: {
            signup: function () {
                var self = this,
                    data = self.getProperties('model.name', 'model.email', 'model.password', 'model.token');

                self.notifications.closePassive();

                this.toggleProperty('submitting');
                this.validate({format: false}).then(function () {
                    ajax({
                        url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                        type: 'POST',
                        dataType: 'json',
                        data: {
                            invitation: [{
                                name: data.name,
                                email: data.email,
                                password: data.password,
                                token: data.token
                            }]
                        }
                    }).then(function () {
                        self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                            identification: self.get('model.email'),
                            password: self.get('model.password')
                        });
                    }, function (resp) {
                        self.toggleProperty('submitting');
                        self.notifications.showAPIError(resp);
                    });
                }, function (errors) {
                    self.toggleProperty('submitting');
                    self.notifications.showErrors(errors);
                });
            }
        }
    });

    __exports__["default"] = SignupController;
  });
define("ghost/docs/js/nav", 
  [],
  function() {
    "use strict";
    (function(){

        // TODO: unbind click events when nav is desktop sized

        // Element vars
        var menu_button = document.querySelector(".menu-button"),
            viewport = document.querySelector(".viewport"),
            global_nav = document.querySelector(".global-nav"),
            page_content = document.querySelector(".viewport .page-content");

        // mediaQuery listener
        var mq_max_1025 = window.matchMedia("(max-width: 1025px)");
        mq_max_1025.addListener(show_hide_nav);
        show_hide_nav(mq_max_1025);

        menu_button.addEventListener("click", function(e) {
            e.preventDefault();
            if (menu_button.getAttribute('data-nav-open')) {
                close_nav();
            } else {
                open_nav();
            }
        });

        page_content.addEventListener("click", function(e) {
            e.preventDefault();
            console.log("click viewport");
            if (viewport.classList.contains("global-nav-expanded")) {
                console.log("close nav from viewport");
                close_nav();
            }
        });

        var open_nav = function(){
            menu_button.setAttribute("data-nav-open", "true");
            viewport.classList.add("global-nav-expanded");
            global_nav.classList.add("global-nav-expanded");
        };

        var close_nav = function(){
            menu_button.removeAttribute('data-nav-open');
            viewport.classList.remove("global-nav-expanded");
            global_nav.classList.remove("global-nav-expanded");
        };

        function show_hide_nav(mq) {
            if (mq.matches) {
                // Window is 1025px or less
            } else {
                // Window is 1026px or more
                viewport.classList.remove("global-nav-expanded");
                global_nav.classList.remove("global-nav-expanded");
            }
        }

    })();
  });
define("ghost/helpers/gh-blog-url", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var blogUrl = Ember.Handlebars.makeBoundHelper(function () {
        return new Ember.Handlebars.SafeString(this.get('config.blogUrl'));
    });

    __exports__["default"] = blogUrl;
  });
define("ghost/helpers/gh-count-characters", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var countCharacters = Ember.Handlebars.makeBoundHelper(function (content) {
        var el = document.createElement('span'),
            length = content ? content.length : 0;

        el.className = 'word-count';

        if (length > 180) {
            el.style.color = '#E25440';
        } else {
            el.style.color = '#9E9D95';
        }

        el.innerHTML = 200 - length;

        return new Ember.Handlebars.SafeString(el.outerHTML);
    });

    __exports__["default"] = countCharacters;
  });
define("ghost/helpers/gh-count-down-characters", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var countDownCharacters = Ember.Handlebars.makeBoundHelper(function (content, maxCharacters) {
        var el = document.createElement('span'),
            length = content ? content.length : 0;

        el.className = 'word-count';

        if (length > maxCharacters) {
            el.style.color = '#E25440';
        } else {
            el.style.color = '#9FBB58';
        }

        el.innerHTML = length;

        return new Ember.Handlebars.SafeString(el.outerHTML);
    });

    __exports__["default"] = countDownCharacters;
  });
define("ghost/helpers/gh-count-words", 
  ["ghost/utils/word-count","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var counter = __dependency1__["default"];

    var countWords = Ember.Handlebars.makeBoundHelper(function (markdown) {
        if (/^\s*$/.test(markdown)) {
            return '0 words';
        }

        var count = counter(markdown || '');

        return count + (count === 1 ? ' word' : ' words');
    });

    __exports__["default"] = countWords;
  });
define("ghost/helpers/gh-format-html", 
  ["ghost/utils/caja-sanitizers","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global Handlebars, html_sanitize*/
    var cajaSanitizers = __dependency1__["default"];

    var formatHTML = Ember.Handlebars.makeBoundHelper(function (html) {
        var escapedhtml = html || '';

        // replace script and iFrame
        // jscs:disable
        escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
        escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');
        // jscs:enable

        // sanitize HTML
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        return new Handlebars.SafeString(escapedhtml);
    });

    __exports__["default"] = formatHTML;
  });
define("ghost/helpers/gh-format-markdown", 
  ["ghost/utils/caja-sanitizers","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global Showdown, Handlebars, html_sanitize*/
    var cajaSanitizers = __dependency1__["default"];

    var showdown,
        formatMarkdown;

    showdown = new Showdown.converter({extensions: ['ghostimagepreview', 'ghostgfm', 'footnotes', 'highlight']});

    formatMarkdown = Ember.Handlebars.makeBoundHelper(function (markdown) {
        var escapedhtml = '';

        // convert markdown to HTML
        escapedhtml = showdown.makeHtml(markdown || '');

        // replace script and iFrame
        // jscs:disable
        escapedhtml = escapedhtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            '<pre class="js-embed-placeholder">Embedded JavaScript</pre>');
        escapedhtml = escapedhtml.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            '<pre class="iframe-embed-placeholder">Embedded iFrame</pre>');
        // jscs:enable

        // sanitize html
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        escapedhtml = html_sanitize(escapedhtml, cajaSanitizers.url, cajaSanitizers.id);
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

        return new Handlebars.SafeString(escapedhtml);
    });

    __exports__["default"] = formatMarkdown;
  });
define("ghost/helpers/gh-format-timeago", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    var formatTimeago = Ember.Handlebars.makeBoundHelper(function (timeago) {
        return moment(timeago).fromNow();
        // stefanpenner says cool for small number of timeagos.
        // For large numbers moment sucks => single Ember.Object based clock better
        // https://github.com/manuelmitasch/ghost-admin-ember-demo/commit/fba3ab0a59238290c85d4fa0d7c6ed1be2a8a82e#commitcomment-5396524
    });

    __exports__["default"] = formatTimeago;
  });
define("ghost/helpers/gh-path", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    // Handlebars Helper {{gh-path}}
    // Usage: Assume 'http://www.myghostblog.org/myblog/'
    // {{gh-path}} or {{gh-path ‘blog’}} for Ghost’s root (/myblog/)
    // {{gh-path ‘admin’}} for Ghost’s admin root (/myblog/ghost/)
    // {{gh-path ‘api’}} for Ghost’s api root (/myblog/ghost/api/v0.1/)
    // {{gh-path 'admin' '/assets/hi.png'}} for resolved url (/myblog/ghost/assets/hi.png)
    var ghostPaths = __dependency1__["default"];

    function ghostPathsHelper(path, url) {
        var base,
            argsLength = arguments.length,
            paths = ghostPaths();

        // function is always invoked with at least one parameter, so if
        // arguments.length is 1 there were 0 arguments passed in explicitly
        if (argsLength === 1) {
            path = 'blog';
        } else if (argsLength === 2 && !/^(blog|admin|api)$/.test(path)) {
            url = path;
            path = 'blog';
        }

        switch (path.toString()) {
            case 'blog':
                base = paths.blogRoot;
                break;
            case 'admin':
                base = paths.adminRoot;
                break;
            case 'api':
                base = paths.apiRoot;
                break;
            default:
                base = paths.blogRoot;
                break;
        }

        // handle leading and trailing slashes

        base = base[base.length - 1] !== '/' ? base + '/' : base;

        if (url && url.length > 0) {
            if (url[0] === '/') {
                url = url.substr(1);
            }

            base = base + url;
        }

        return new Ember.Handlebars.SafeString(base);
    }

    __exports__["default"] = ghostPathsHelper;
  });
define("ghost/initializers/authentication", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var Ghost,
        AuthenticationInitializer;

    Ghost = ghostPaths();

    AuthenticationInitializer = {
        name: 'authentication',
        before: 'simple-auth',
        after: 'registerTrailingLocationHistory',

        initialize: function (container) {
            window.ENV = window.ENV || {};

            window.ENV['simple-auth'] = {
                authenticationRoute: 'signin',
                routeAfterAuthentication: 'posts',
                authorizer: 'simple-auth-authorizer:oauth2-bearer',
                localStorageKey: 'ghost' + (Ghost.subdir.indexOf('/') === 0 ? '-' + Ghost.subdir.substr(1) : '') + ':session'
            };

            window.ENV['simple-auth-oauth2'] = {
                serverTokenEndpoint: Ghost.apiRoot + '/authentication/token',
                serverTokenRevocationEndpoint: Ghost.apiRoot + '/authentication/revoke',
                refreshAccessTokens: true
            };

            SimpleAuth.Session.reopen({
                user: Ember.computed(function () {
                    return container.lookup('store:main').find('user', 'me');
                })
            });

            SimpleAuth.Authenticators.OAuth2.reopen({
                makeRequest: function (url, data) {
                    data.client_id = 'ghost-admin';
                    return this._super(url, data);
                }
            });
        }
    };

    __exports__["default"] = AuthenticationInitializer;
  });
define("ghost/initializers/dropdown", 
  ["ghost/utils/dropdown-service","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownService = __dependency1__["default"];

    var dropdownInitializer = {
        name: 'dropdown',

        initialize: function (container, application) {
            application.register('dropdown:service', DropdownService);

            // Inject dropdowns
            application.inject('component:gh-dropdown', 'dropdown', 'dropdown:service');
            application.inject('component:gh-dropdown-button', 'dropdown', 'dropdown:service');
            application.inject('controller:modals.delete-post', 'dropdown', 'dropdown:service');
            application.inject('controller:modals.transfer-owner', 'dropdown', 'dropdown:service');
            application.inject('route:application', 'dropdown', 'dropdown:service');

            // Inject popovers
            application.inject('component:gh-popover', 'dropdown', 'dropdown:service');
            application.inject('component:gh-popover-button', 'dropdown', 'dropdown:service');
            application.inject('route:application', 'dropdown', 'dropdown:service');
        }
    };

    __exports__["default"] = dropdownInitializer;
  });
define("ghost/initializers/ghost-config", 
  ["ghost/utils/config-parser","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var getConfig = __dependency1__["default"];

    var ConfigInitializer = {
        name: 'config',

        initialize: function (container, application) {
            var config = getConfig();
            application.register('ghost:config', config, {instantiate: false});

            application.inject('route', 'config', 'ghost:config');
            application.inject('controller', 'config', 'ghost:config');
            application.inject('component', 'config', 'ghost:config');
        }
    };

    __exports__["default"] = ConfigInitializer;
  });
define("ghost/initializers/ghost-paths", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var ghostPathsInitializer = {
        name: 'ghost-paths',
        after: 'store',

        initialize: function (container, application) {
            application.register('ghost:paths', ghostPaths(), {instantiate: false});

            application.inject('route', 'ghostPaths', 'ghost:paths');
            application.inject('model', 'ghostPaths', 'ghost:paths');
            application.inject('controller', 'ghostPaths', 'ghost:paths');
        }
    };

    __exports__["default"] = ghostPathsInitializer;
  });
define("ghost/initializers/notifications", 
  ["ghost/utils/notifications","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Notifications = __dependency1__["default"];

    var injectNotificationsInitializer = {
        name: 'injectNotifications',
        before: 'authentication',

        initialize: function (container, application) {
            application.register('notifications:main', Notifications);

            application.inject('controller', 'notifications', 'notifications:main');
            application.inject('component', 'notifications', 'notifications:main');
            application.inject('router', 'notifications', 'notifications:main');
            application.inject('route', 'notifications', 'notifications:main');
        }
    };

    __exports__["default"] = injectNotificationsInitializer;
  });
define("ghost/initializers/store-injector", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var StoreInjector = {
        name: 'store-injector',
        after: 'store',

        initialize: function (container, application) {
            application.inject('component:gh-role-selector', 'store', 'store:main');
        }
    };

    __exports__["default"] = StoreInjector;
  });
define("ghost/initializers/trailing-history", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global Ember */

    var trailingHistory,
        registerTrailingLocationHistory;

    trailingHistory = Ember.HistoryLocation.extend({
        formatURL: function () {
            // jscs: disable
            return this._super.apply(this, arguments).replace(/\/?$/, '/');
            // jscs: enable
        }
    });

    registerTrailingLocationHistory = {
        name: 'registerTrailingLocationHistory',

        initialize: function (container, application) {
            application.register('location:trailing-history', trailingHistory);
        }
    };

    __exports__["default"] = registerTrailingLocationHistory;
  });
define("ghost/mixins/body-event-listener", 
  ["exports"],
  function(__exports__) {
    "use strict";

    // Code modified from Addepar/ember-widgets
    // https://github.com/Addepar/ember-widgets/blob/master/src/mixins.coffee#L39

    var BodyEventListener = Ember.Mixin.create({
        bodyElementSelector: 'html',
        bodyClick: Ember.K,

        init: function () {
            this._super();

            return Ember.run.next(this, this._setupDocumentHandlers);
        },

        willDestroy: function () {
            this._super();

            return this._removeDocumentHandlers();
        },

        _setupDocumentHandlers: function () {
            if (this._clickHandler) {
                return;
            }

            var self = this;

            this._clickHandler = function () {
                return self.bodyClick();
            };

            return $(this.get('bodyElementSelector')).on('click', this._clickHandler);
        },

        _removeDocumentHandlers: function () {
            $(this.get('bodyElementSelector')).off('click', this._clickHandler);
            this._clickHandler = null;
        },

        // http://stackoverflow.com/questions/152975/how-to-detect-a-click-outside-an-element
        click: function (event) {
            return event.stopPropagation();
        }
    });

    __exports__["default"] = BodyEventListener;
  });
define("ghost/mixins/current-user-settings", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var CurrentUserSettings = Ember.Mixin.create({
        currentUser: function () {
            return this.store.find('user', 'me');
        },

        transitionAuthor: function () {
            var self = this;

            return function (user) {
                if (user.get('isAuthor')) {
                    return self.transitionTo('settings.users.user', user);
                }

                return user;
            };
        },

        transitionEditor: function () {
            var self = this;

            return function (user) {
                if (user.get('isEditor')) {
                    return self.transitionTo('settings.users');
                }

                return user;
            };
        }
    });

    __exports__["default"] = CurrentUserSettings;
  });
define("ghost/mixins/dropdown-mixin", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*
      Dropdowns and their buttons are evented and do not propagate clicks.
    */
    var DropdownMixin = Ember.Mixin.create(Ember.Evented, {
        classNameBindings: ['isOpen:open:closed'],
        isOpen: false,

        click: function (event) {
            this._super(event);

            return event.stopPropagation();
        }
    });

    __exports__["default"] = DropdownMixin;
  });
define("ghost/mixins/editor-base-controller", 
  ["ghost/mixins/marker-manager","ghost/models/post","ghost/utils/bound-one-way","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /* global console */
    var MarkerManager = __dependency1__["default"];
    var PostModel = __dependency2__["default"];
    var boundOneWay = __dependency3__["default"];

    var watchedProps,
        EditorControllerMixin;

    // this array will hold properties we need to watch
    // to know if the model has been changed (`controller.isDirty`)
    watchedProps = ['model.scratch', 'model.titleScratch', 'model.isDirty', 'model.tags.[]'];

    PostModel.eachAttribute(function (name) {
        watchedProps.push('model.' + name);
    });

    EditorControllerMixin = Ember.Mixin.create(MarkerManager, {
        needs: ['post-tags-input', 'post-settings-menu'],

        autoSaveId: null,
        timedSaveId: null,
        codemirror: null,
        codemirrorComponent: null,

        init: function () {
            var self = this;

            this._super();

            window.onbeforeunload = function () {
                return self.get('isDirty') ? self.unloadDirtyMessage() : null;
            };
        },

        /**
         * By default, a post will not change its publish state.
         * Only with a user-set value (via setSaveType action)
         * can the post's status change.
         */
        willPublish: boundOneWay('model.isPublished'),

        // Make sure editor starts with markdown shown
        isPreview: false,

        // set by the editor route and `isDirty`. useful when checking
        // whether the number of tags has changed for `isDirty`.
        previousTagNames: null,

        tagNames: Ember.computed('model.tags.@each.name', function () {
            return this.get('model.tags').mapBy('name');
        }),

        // compares previousTagNames to tagNames
        tagNamesEqual: function () {
            var tagNames = this.get('tagNames'),
                previousTagNames = this.get('previousTagNames'),
                hashCurrent,
                hashPrevious;

            // beware! even if they have the same length,
            // that doesn't mean they're the same.
            if (tagNames.length !== previousTagNames.length) {
                return false;
            }

            // instead of comparing with slow, nested for loops,
            // perform join on each array and compare the strings
            hashCurrent = tagNames.join('');
            hashPrevious = previousTagNames.join('');

            return hashCurrent === hashPrevious;
        },

        // a hook created in editor-base-route's setupController
        modelSaved: function () {
            var model = this.get('model');

            // safer to updateTags on save in one place
            // rather than in all other places save is called
            model.updateTags();

            // set previousTagNames to current tagNames for isDirty check
            this.set('previousTagNames', this.get('tagNames'));

            // `updateTags` triggers `isDirty => true`.
            // for a saved model it would otherwise be false.

            // if the two "scratch" properties (title and content) match the model, then
            // it's ok to set isDirty to false
            if (model.get('titleScratch') === model.get('title') &&
                model.get('scratch') === model.get('markdown')) {
                this.set('isDirty', false);
            }
        },

        // an ugly hack, but necessary to watch all the model's properties
        // and more, without having to be explicit and do it manually
        isDirty: Ember.computed.apply(Ember, watchedProps.concat(function (key, value) {
            if (arguments.length > 1) {
                return value;
            }

            var model = this.get('model'),
                markdown = model.get('markdown'),
                title = model.get('title'),
                titleScratch = model.get('titleScratch'),
                scratch = this.getMarkdown().withoutMarkers,
                changedAttributes;

            if (!this.tagNamesEqual()) {
                return true;
            }

            if (titleScratch !== title) {
                return true;
            }

            // since `scratch` is not model property, we need to check
            // it explicitly against the model's markdown attribute
            if (markdown !== scratch) {
                return true;
            }

            // if the Adapter failed to save the model isError will be true
            // and we should consider the model still dirty.
            if (model.get('isError')) {
                return true;
            }

            // models created on the client always return `isDirty: true`,
            // so we need to see which properties have actually changed.
            if (model.get('isNew')) {
                changedAttributes = Ember.keys(model.changedAttributes());

                if (changedAttributes.length) {
                    return true;
                }

                return false;
            }

            // even though we use the `scratch` prop to show edits,
            // which does *not* change the model's `isDirty` property,
            // `isDirty` will tell us if the other props have changed,
            // as long as the model is not new (model.isNew === false).
            return model.get('isDirty');
        })),

        // used on window.onbeforeunload
        unloadDirtyMessage: function () {
            return '==============================\n\n' +
                'Hey there! It looks like you\'re in the middle of writing' +
                ' something and you haven\'t saved all of your content.' +
                '\n\nSave before you go!\n\n' +
                '==============================';
        },

        // TODO: This has to be moved to the I18n localization file.
        // This structure is supposed to be close to the i18n-localization which will be used soon.
        messageMap: {
            errors: {
                post: {
                    published: {
                        published: 'Update failed.',
                        draft: 'Saving failed.'
                    },
                    draft: {
                        published: 'Publish failed.',
                        draft: 'Saving failed.'
                    }

                }
            },

            success: {
                post: {
                    published: {
                        published: 'Updated.',
                        draft: 'Saved.'
                    },
                    draft: {
                        published: 'Published!',
                        draft: 'Saved.'
                    }
                }
            }
        },

        showSaveNotification: function (prevStatus, status, delay) {
            var message = this.messageMap.success.post[prevStatus][status],
                path = this.get('ghostPaths.url').join(this.get('config.blogUrl'), this.get('model.url'));

            if (status === 'published') {
                message += '&nbsp;<a href="' + path + '">View Post</a>';
            }
            this.notifications.showSuccess(message, {delayed: delay});
        },

        showErrorNotification: function (prevStatus, status, errors, delay) {
            var message = this.messageMap.errors.post[prevStatus][status],
                error = (errors && errors[0] && errors[0].message) || 'Unknown Error';

            message += '<br />' + error;

            this.notifications.showError(message, {delayed: delay});
        },

        shouldFocusTitle: Ember.computed.alias('model.isNew'),
        shouldFocusEditor: Ember.computed.not('model.isNew'),

        actions: {
            save: function (options) {
                var status = this.get('willPublish') ? 'published' : 'draft',
                    prevStatus = this.get('model.status'),
                    isNew = this.get('model.isNew'),
                    autoSaveId = this.get('autoSaveId'),
                    timedSaveId = this.get('timedSaveId'),
                    self = this,
                    psmController = this.get('controllers.post-settings-menu'),
                    promise;

                options = options || {};

                if (autoSaveId) {
                    Ember.run.cancel(autoSaveId);
                    this.set('autoSaveId', null);
                }

                if (timedSaveId) {
                    Ember.run.cancel(timedSaveId);
                    this.set('timedSaveId', null);
                }

                self.notifications.closePassive();

                // ensure an incomplete tag is finalised before save
                this.get('controllers.post-tags-input').send('addNewTag');

                // Set the properties that are indirected
                // set markdown equal to what's in the editor, minus the image markers.
                this.set('model.markdown', this.getMarkdown().withoutMarkers);
                this.set('model.status', status);

                // Set a default title
                if (!this.get('model.titleScratch').trim()) {
                    this.set('model.titleScratch', '(Untitled)');
                }

                this.set('model.title', this.get('model.titleScratch'));
                this.set('model.meta_title', psmController.get('metaTitleScratch'));
                this.set('model.meta_description', psmController.get('metaDescriptionScratch'));

                if (!this.get('model.slug')) {
                    // Cancel any pending slug generation that may still be queued in the
                    // run loop because we need to run it before the post is saved.
                    Ember.run.cancel(psmController.get('debounceId'));

                    psmController.generateAndSetSlug('model.slug');
                }

                promise = Ember.RSVP.resolve(psmController.get('lastPromise')).then(function () {
                    return self.get('model').save(options).then(function (model) {
                        if (!options.silent) {
                            self.showSaveNotification(prevStatus, model.get('status'), isNew ? true : false);
                        }

                        return model;
                    });
                }).catch(function (errors) {
                    if (!options.silent) {
                        self.showErrorNotification(prevStatus, self.get('model.status'), errors);
                    }

                    self.set('model.status', prevStatus);

                    return self.get('model');
                });

                psmController.set('lastPromise', promise);

                return promise;
            },

            setSaveType: function (newType) {
                if (newType === 'publish') {
                    this.set('willPublish', true);
                } else if (newType === 'draft') {
                    this.set('willPublish', false);
                } else {
                    console.warn('Received invalid save type; ignoring.');
                }
            },

            // set from a `sendAction` on the codemirror component,
            // so that we get a reference for handling uploads.
            setCodeMirror: function (codemirrorComponent) {
                var codemirror = codemirrorComponent.get('codemirror');

                this.set('codemirrorComponent', codemirrorComponent);
                this.set('codemirror', codemirror);
            },

            // fired from the gh-markdown component when an image upload starts
            disableCodeMirror: function () {
                this.get('codemirrorComponent').disableCodeMirror();
            },

            // fired from the gh-markdown component when an image upload finishes
            enableCodeMirror: function () {
                this.get('codemirrorComponent').enableCodeMirror();
            },

            // Match the uploaded file to a line in the editor, and update that line with a path reference
            // ensuring that everything ends up in the correct place and format.
            handleImgUpload: function (e, resultSrc) {
                var editor = this.get('codemirror'),
                    line = this.findLine(Ember.$(e.currentTarget).attr('id')),
                    lineNumber = editor.getLineNumber(line),
                    // jscs:disable
                    match = line.text.match(/\([^\n]*\)?/),
                    // jscs:enable
                    replacement = '(http://)';

                if (match) {
                    // simple case, we have the parenthesis
                    editor.setSelection(
                        {line: lineNumber, ch: match.index + 1},
                        {line: lineNumber, ch: match.index + match[0].length - 1}
                    );
                } else {
                    // jscs:disable
                    match = line.text.match(/\]/);
                    // jscs:enable
                    if (match) {
                        editor.replaceRange(
                            replacement,
                            {line: lineNumber, ch: match.index + 1},
                            {line: lineNumber, ch: match.index + 1}
                        );
                        editor.setSelection(
                            {line: lineNumber, ch: match.index + 2},
                            {line: lineNumber, ch: match.index + replacement.length}
                        );
                    }
                }

                editor.replaceSelection(resultSrc);
            },

            togglePreview: function (preview) {
                this.set('isPreview', preview);
            },

            autoSave: function () {
                if (this.get('model.isDraft')) {
                    var autoSaveId,
                        timedSaveId;

                    timedSaveId = Ember.run.throttle(this, 'send', 'save', {silent: true, disableNProgress: true}, 60000, false);
                    this.set('timedSaveId', timedSaveId);

                    autoSaveId = Ember.run.debounce(this, 'send', 'save', {silent: true, disableNProgress: true}, 3000);
                    this.set('autoSaveId', autoSaveId);
                }
            },

            autoSaveNew: function () {
                if (this.get('model.isNew')) {
                    this.send('save', {silent: true, disableNProgress: true});
                }
            }
        }
    });

    __exports__["default"] = EditorControllerMixin;
  });
define("ghost/mixins/editor-base-route", 
  ["ghost/mixins/shortcuts-route","ghost/mixins/style-body","ghost/mixins/loading-indicator","ghost/utils/editor-shortcuts","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var ShortcutsRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];
    var editorShortcuts = __dependency4__["default"];

    var EditorBaseRoute = Ember.Mixin.create(styleBody, ShortcutsRoute, loadingIndicator, {
        classNames: ['editor'],

        actions: {
            save: function () {
                this.get('controller').send('save');
            },

            publish: function () {
                var controller = this.get('controller');

                controller.send('setSaveType', 'publish');
                controller.send('save');
            },

            toggleZenMode: function () {
                Ember.$('body').toggleClass('zen');
            },

            // The actual functionality is implemented in utils/codemirror-shortcuts
            codeMirrorShortcut: function (options) {
                // Only fire editor shortcuts when the editor has focus.
                if (Ember.$('.CodeMirror.CodeMirror-focused').length > 0) {
                    this.get('controller.codemirror').shortcut(options.type);
                }
            },

            willTransition: function (transition) {
                var controller = this.get('controller'),
                    scratch = controller.get('model.scratch'),
                    controllerIsDirty = controller.get('isDirty'),
                    model = controller.get('model'),
                    state = model.getProperties('isDeleted', 'isSaving', 'isDirty', 'isNew'),
                    fromNewToEdit,
                    deletedWithoutChanges;

                fromNewToEdit = this.get('routeName') === 'editor.new' &&
                    transition.targetName === 'editor.edit' &&
                    transition.intent.contexts &&
                    transition.intent.contexts[0] &&
                    transition.intent.contexts[0].id === model.get('id');

                deletedWithoutChanges = state.isDeleted &&
                    (state.isSaving || !state.isDirty);

                this.send('closeSettingsMenu');

                if (!fromNewToEdit && !deletedWithoutChanges && controllerIsDirty) {
                    transition.abort();
                    this.send('openModal', 'leave-editor', [controller, transition]);
                    return;
                }

                // The controller may hold model state that will be lost in the transition,
                // so we need to apply it now.
                if (fromNewToEdit && controllerIsDirty) {
                    if (scratch !== model.get('markdown')) {
                        model.set('markdown', scratch);
                    }
                }

                if (state.isNew) {
                    model.deleteRecord();
                }

                // since the transition is now certain to complete..
                window.onbeforeunload = null;

                // remove model-related listeners created in editor-base-route
                this.detachModelHooks(controller, model);
            }
        },

        renderTemplate: function (controller, model) {
            this._super(controller, model);

            this.render('post-settings-menu', {
                into: 'application',
                outlet: 'settings-menu',
                model: model
            });
        },

        shortcuts: editorShortcuts,

        attachModelHooks: function (controller, model) {
            // this will allow us to track when the model is saved and update the controller
            // so that we can be sure controller.isDirty is correct, without having to update the
            // controller on each instance of `model.save()`.
            //
            // another reason we can't do this on `model.save().then()` is because the post-settings-menu
            // also saves the model, and passing messages is difficult because we have two
            // types of editor controllers, and the PSM also exists on the posts.post route.
            //
            // The reason we can't just keep this functionality in the editor controller is
            // because we need to remove these handlers on `willTransition` in the editor route.
            model.on('didCreate', controller, controller.get('modelSaved'));
            model.on('didUpdate', controller, controller.get('modelSaved'));
        },

        detachModelHooks: function (controller, model) {
            model.off('didCreate', controller, controller.get('modelSaved'));
            model.off('didUpdate', controller, controller.get('modelSaved'));
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            var tags = model.get('tags');

            controller.set('model.scratch', model.get('markdown'));

            controller.set('model.titleScratch', model.get('title'));

            if (tags) {
                // used to check if anything has changed in the editor
                controller.set('previousTagNames', tags.mapBy('name'));
            } else {
                controller.set('previousTagNames', []);
            }

            // attach model-related listeners created in editor-base-route
            this.attachModelHooks(controller, model);
        }
    });

    __exports__["default"] = EditorBaseRoute;
  });
define("ghost/mixins/editor-base-view", 
  ["ghost/utils/set-scroll-classname","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];

    var EditorViewMixin = Ember.Mixin.create({
        // create a hook for jQuery logic that will run after
        // a view and all child views have been rendered,
        // since didInsertElement runs only when the view's el
        // has rendered, and not necessarily all child views.
        //
        // http://mavilein.github.io/javascript/2013/08/01/Ember-JS-After-Render-Event/
        // http://emberjs.com/api/classes/Ember.run.html#method_next
        scheduleAfterRender: function () {
            Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
        }.on('didInsertElement'),

        // all child views will have rendered when this fires
        afterRenderEvent: function () {
            var $previewViewPort = this.$('.js-entry-preview-content');

            // cache these elements for use in other methods
            this.set('$previewViewPort', $previewViewPort);
            this.set('$previewContent', this.$('.js-rendered-markdown'));

            $previewViewPort.scroll(Ember.run.bind($previewViewPort, setScrollClassName, {
                target: this.$('.js-entry-preview'),
                offset: 10
            }));
        },

        removeScrollHandlers: function () {
            this.get('$previewViewPort').off('scroll');
        }.on('willDestroyElement'),

        // updated when gh-codemirror component scrolls
        markdownScrollInfo: null,

        // percentage of scroll position to set htmlPreview
        scrollPosition: Ember.computed('markdownScrollInfo', function () {
            if (!this.get('markdownScrollInfo')) {
                return 0;
            }

            var scrollInfo = this.get('markdownScrollInfo'),
                markdownHeight,
                previewHeight,
                ratio;

            markdownHeight = scrollInfo.height - scrollInfo.clientHeight;
            previewHeight = this.get('$previewContent').height() - this.get('$previewViewPort').height();

            ratio = previewHeight / markdownHeight;

            return scrollInfo.top * ratio;
        })
    });

    __exports__["default"] = EditorViewMixin;
  });
define("ghost/mixins/loading-indicator", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // mixin used for routes to display a loading indicator when there is network activity
    var loaderOptions,
        loadingIndicator;

    loaderOptions = {
        showSpinner: false
    };

    NProgress.configure(loaderOptions);

    loadingIndicator = Ember.Mixin.create({
        actions:  {

            loading: function () {
                NProgress.start();
                this.router.one('didTransition', function () {
                    NProgress.done();
                });

                return true;
            },

            error: function () {
                NProgress.done();

                return true;
            }
        }
    });

    __exports__["default"] = loadingIndicator;
  });
define("ghost/mixins/marker-manager", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var MarkerManager = Ember.Mixin.create({
        // jscs:disable
        imageMarkdownRegex: /^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim,
        markerRegex: /\{<([\w\W]*?)>\}/,
        // jscs:enable

        uploadId: 1,

        // create an object that will be shared amongst instances.
        // makes it easier to use helper functions in different modules
        markers: {},

        // Add markers to the line if it needs one
        initMarkers: function (line) {
            var imageMarkdownRegex = this.get('imageMarkdownRegex'),
                markerRegex = this.get('markerRegex'),
                editor = this.get('codemirror'),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker = line.text.match(markerRegex);

            if (isImage && !hasMarker) {
                this.addMarker(line, editor.getLineNumber(line));
            }
        },

        // Get the markdown with all the markers stripped
        getMarkdown: function (value) {
            var marker, id,
                editor = this.get('codemirror'),
                markers = this.get('markers'),
                markerRegexForId = this.get('markerRegexForId'),
                oldValue = value || editor.getValue(),
                newValue = oldValue;

            for (id in markers) {
                if (markers.hasOwnProperty(id)) {
                    marker = markers[id];
                    newValue = newValue.replace(markerRegexForId(id), '');
                }
            }

            return {
                withMarkers: oldValue,
                withoutMarkers: newValue
            };
        },

        // check the given line to see if it has an image, and if it correctly has a marker
        // in the special case of lines which were just pasted in, any markers are removed to prevent duplication
        checkLine: function (ln, mode) {
            var editor = this.get('codemirror'),
                line = editor.getLineHandle(ln),
                imageMarkdownRegex = this.get('imageMarkdownRegex'),
                markerRegex = this.get('markerRegex'),
                isImage = line.text.match(imageMarkdownRegex),
                hasMarker;

            // We care if it is an image
            if (isImage) {
                hasMarker = line.text.match(markerRegex);

                if (hasMarker && (mode === 'paste' || mode === 'undo')) {
                    // this could be a duplicate, and won't be a real marker
                    this.stripMarkerFromLine(line);
                }

                if (!hasMarker) {
                    this.addMarker(line, ln);
                }
            }
            // TODO: hasMarker but no image?
        },

        // Add a marker to the given line
        // Params:
        // line - CodeMirror LineHandle
        // ln - line number
        addMarker: function (line, ln) {
            var marker,
                markers = this.get('markers'),
                editor = this.get('codemirror'),
                uploadPrefix = 'image_upload',
                uploadId = this.get('uploadId'),
                magicId = '{<' + uploadId + '>}',
                newText = magicId + line.text;

            editor.replaceRange(
                newText,
                {line: ln, ch: 0},
                {line: ln, ch: newText.length}
            );

            marker = editor.markText(
                {line: ln, ch: 0},
                {line: ln, ch: (magicId.length)},
                {collapsed: true}
            );

            markers[uploadPrefix + '_' + uploadId] = marker;
            this.set('uploadId', uploadId += 1);
        },

        // Check each marker to see if it is still present in the editor and if it still corresponds to image markdown
        // If it is no longer a valid image, remove it
        checkMarkers: function () {
            var id, marker, line,
                editor = this.get('codemirror'),
                markers = this.get('markers'),
                imageMarkdownRegex = this.get('imageMarkdownRegex');

            for (id in markers) {
                if (markers.hasOwnProperty(id)) {
                    marker = markers[id];

                    if (marker.find()) {
                        line = editor.getLineHandle(marker.find().from.line);
                        if (!line.text.match(imageMarkdownRegex)) {
                            this.removeMarker(id, marker, line);
                        }
                    } else {
                        this.removeMarker(id, marker);
                    }
                }
            }
        },

        // this is needed for when we transition out of the editor.
        // since the markers object is persistent and shared between classes that
        // mix in this mixin, we need to make sure markers don't carry over between edits.
        clearMarkers: function () {
            var markers = this.get('markers'),
                id,
                marker;

            // can't just `this.set('markers', {})`,
            // since it wouldn't apply to this mixin,
            // but only to the class that mixed this mixin in
            for (id in markers) {
                if (markers.hasOwnProperty(id)) {
                    marker = markers[id];
                    delete markers[id];
                    marker.clear();
                }
            }
        },

        // Remove a marker
        // Will be passed a LineHandle if we already know which line the marker is on
        removeMarker: function (id, marker, line) {
            var markers = this.get('markers');

            delete markers[id];
            marker.clear();

            if (line) {
                this.stripMarkerFromLine(line);
            } else {
                this.findAndStripMarker(id);
            }
        },

        // Removes the marker on the given line if there is one
        stripMarkerFromLine: function (line) {
            var editor = this.get('codemirror'),
                ln = editor.getLineNumber(line),

                // jscs:disable
                markerRegex = /\{<([\w\W]*?)>\}/,
                // jscs:enable

                markerText = line.text.match(markerRegex);

            if (markerText) {
                editor.replaceRange(
                    '',
                    {line: ln, ch: markerText.index},
                    {line: ln, ch: markerText.index + markerText[0].length}
                );
            }
        },

        // the regex
        markerRegexForId: function (id) {
            id = id.replace('image_upload_', '');
            return new RegExp('\\{<' + id + '>\\}', 'gmi');
        },

        // Find a marker in the editor by id & remove it
        // Goes line by line to find the marker by it's text if we've lost track of the TextMarker
        findAndStripMarker: function (id) {
            var self = this,
                editor = this.get('codemirror');

            editor.eachLine(function (line) {
                var markerText = self.markerRegexForId(id).exec(line.text),
                    ln;

                if (markerText) {
                    ln = editor.getLineNumber(line);
                    editor.replaceRange(
                        '',
                        {line: ln, ch: markerText.index},
                        {line: ln, ch: markerText.index + markerText[0].length}
                    );
                }
            });
        },

        // Find the line with the marker which matches
        findLine: function (resultId) {
            var editor = this.get('codemirror'),
                markers = this.get('markers');

            // try to find the right line to replace
            if (markers.hasOwnProperty(resultId) && markers[resultId].find()) {
                return editor.getLineHandle(markers[resultId].find().from.line);
            }

            return false;
        }
    });

    __exports__["default"] = MarkerManager;
  });
define("ghost/mixins/nprogress-save", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NProgressSaveMixin = Ember.Mixin.create({
        save: function (options) {
            if (options && options.disableNProgress) {
                return this._super(options);
            }

            NProgress.start();

            return this._super(options).then(function (value) {
                NProgress.done();

                return value;
            }).catch(function (error) {
                NProgress.done();

                return Ember.RSVP.reject(error);
            });
        }
    });

    __exports__["default"] = NProgressSaveMixin;
  });
define("ghost/mixins/pagination-controller", 
  ["ghost/utils/ajax","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var getRequestErrorMessage = __dependency1__.getRequestErrorMessage;

    var PaginationControllerMixin = Ember.Mixin.create({
        // set from PaginationRouteMixin
        paginationSettings: null,

        // indicates whether we're currently loading the next page
        isLoading: null,

        /**
         * Takes an ajax response, concatenates any error messages, then generates an error notification.
         * @param {jqXHR} response The jQuery ajax reponse object.
         * @return
         */
        reportLoadError: function (response) {
            var message = 'A problem was encountered while loading more records';

            if (response) {
                // Get message from response
                message += ': ' + getRequestErrorMessage(response, true);
            } else {
                message += '.';
            }

            this.notifications.showError(message);
        },

        actions: {
            /**
             * Loads the next paginated page of posts into the ember-data store. Will cause the posts list UI to update.
             * @return
             */
            loadNextPage: function () {
                var self = this,
                    store = this.get('store'),
                    recordType = this.get('model').get('type'),
                    metadata = this.store.metadataFor(recordType),
                    nextPage = metadata.pagination && metadata.pagination.next,
                    paginationSettings = this.get('paginationSettings');

                if (nextPage) {
                    this.set('isLoading', true);
                    this.set('paginationSettings.page', nextPage);

                    store.find(recordType, paginationSettings).then(function () {
                        self.set('isLoading', false);
                    }, function (response) {
                        self.reportLoadError(response);
                    });
                }
            },

            resetPagination: function () {
                this.set('paginationSettings.page', 1);
                this.store.metaForType('tag', {pagination: undefined});
            }
        }
    });

    __exports__["default"] = PaginationControllerMixin;
  });
define("ghost/mixins/pagination-route", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var defaultPaginationSettings,
        PaginationRoute;

    defaultPaginationSettings = {
        page: 1,
        limit: 15
    };

    PaginationRoute = Ember.Mixin.create({
        /**
         * Sets up pagination details
         * @param {object} settings specifies additional pagination details
         */
        setupPagination: function (settings) {
            settings = settings || {};
            for (var key in defaultPaginationSettings) {
                if (defaultPaginationSettings.hasOwnProperty(key)) {
                    if (!settings.hasOwnProperty(key)) {
                        settings[key] = defaultPaginationSettings[key];
                    }
                }
            }

            this.set('paginationSettings', settings);
            this.controller.set('paginationSettings', settings);
        }
    });

    __exports__["default"] = PaginationRoute;
  });
define("ghost/mixins/pagination-view-infinite-scroll", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PaginationViewInfiniteScrollMixin = Ember.Mixin.create({

        /**
         * Determines if we are past a scroll point where we need to fetch the next page
         * @param {object} event The scroll event
         */
        checkScroll: function (event) {
            var element = event.target,
                triggerPoint = 100,
                controller = this.get('controller'),
                isLoading = controller.get('isLoading');

            // If we haven't passed our threshold or we are already fetching content, exit
            if (isLoading || (element.scrollTop + element.clientHeight + triggerPoint <= element.scrollHeight)) {
                return;
            }

            controller.send('loadNextPage');
        },

        /**
         * Bind to the scroll event once the element is in the DOM
         */
        attachCheckScroll: function () {
            var el = this.$();

            el.on('scroll', Ember.run.bind(this, this.checkScroll));
        }.on('didInsertElement'),

        /**
         * Unbind from the scroll event when the element is no longer in the DOM
         */
        detachCheckScroll: function () {
            var el = this.$();
            el.off('scroll');
        }.on('willDestroyElement')
    });

    __exports__["default"] = PaginationViewInfiniteScrollMixin;
  });
define("ghost/mixins/selective-save", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // SelectiveSaveMixin adds a saveOnly method to a DS.Model.
    //
    // saveOnly provides a way to save one or more properties of a model while
    // preserving outstanding changes to other properties.
    var SelectiveSaveMixin = Ember.Mixin.create({
        saveOnly: function () {
            if (arguments.length === 0) {
                return Ember.RSVP.resolve();
            }

            if (arguments.length === 1 && Ember.isArray(arguments[0])) {
                return this.saveOnly.apply(this, Array.prototype.slice.call(arguments[0]));
            }

            var propertiesToSave = Array.prototype.slice.call(arguments),
                changed,
                hasMany = {},
                belongsTo = {},
                self = this;

            changed = this.changedAttributes();

            // disable observers so we can make changes to the model but not have
            // them reflected by the UI
            this.beginPropertyChanges();

            // make a copy of any relations the model may have so they can
            // be reapplied later
            this.eachRelationship(function (name, meta) {
                if (meta.kind === 'hasMany') {
                    hasMany[name] = self.get(name).slice();
                    return;
                }

                if (meta.kind === 'belongsTo') {
                    belongsTo[name] = self.get(name);
                    return;
                }
            });

            try {
                // roll back all changes to the model and then reapply only those that
                // are part of the saveOnly

                self.rollback();

                propertiesToSave.forEach(function (name) {
                    if (hasMany.hasOwnProperty(name)) {
                        self.get(name).clear();

                        hasMany[name].forEach(function (relatedType) {
                            self.get(name).pushObject(relatedType);
                        });

                        return;
                    }

                    if (belongsTo.hasOwnProperty(name)) {
                        return self.updateBelongsTo(name, belongsTo[name]);
                    }

                    if (changed.hasOwnProperty(name)) {
                        return self.set(name, changed[name][1]);
                    }
                });
            }
            catch (err) {
                // if we were not able to get the model into the correct state
                // put it back the way we found it and return a rejected promise

                Ember.keys(changed).forEach(function (name) {
                    self.set(name, changed[name][1]);
                });

                Ember.keys(hasMany).forEach(function (name) {
                    self.updateHasMany(name, hasMany[name]);
                });

                Ember.keys(belongsTo).forEach(function (name) {
                    self.updateBelongsTo(name, belongsTo[name]);
                });

                self.endPropertyChanges();

                return Ember.RSVP.reject(new Error(err.message || 'Error during saveOnly. Changes NOT saved.'));
            }

            return this.save().finally(function () {
                // reapply any changes that were not part of the save

                Ember.keys(changed).forEach(function (name) {
                    if (propertiesToSave.hasOwnProperty(name)) {
                        return;
                    }

                    self.set(name, changed[name][1]);
                });

                Ember.keys(hasMany).forEach(function (name) {
                    if (propertiesToSave.hasOwnProperty(name)) {
                        return;
                    }

                    self.updateHasMany(name, hasMany[name]);
                });

                Ember.keys(belongsTo).forEach(function (name) {
                    if (propertiesToSave.hasOwnProperty(name)) {
                        return;
                    }

                    self.updateBelongsTo(name, belongsTo[name]);
                });

                // signal that we're finished and normal model observation may continue
                self.endPropertyChanges();
            });
        }
    });

    __exports__["default"] = SelectiveSaveMixin;
  });
define("ghost/mixins/settings-menu-controller", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsMenuControllerMixin = Ember.Mixin.create({
        needs: 'application',

        isViewingSubview: Ember.computed('controllers.application.showSettingsMenu', function (key, value) {
            // Not viewing a subview if we can't even see the PSM
            if (!this.get('controllers.application.showSettingsMenu')) {
                return false;
            }
            if (arguments.length > 1) {
                return value;
            }

            return false;
        }),

        actions: {
            showSubview: function () {
                this.set('isViewingSubview', true);
            },

            closeSubview: function () {
                this.set('isViewingSubview', false);
            }
        }
    });

    __exports__["default"] = SettingsMenuControllerMixin;
  });
define("ghost/mixins/shortcuts-route", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global key */

    // Configure KeyMaster to respond to all shortcuts,
    // even inside of
    // input, textarea, and select.
    key.filter = function () {
        return true;
    };

    key.setScope('default');
    /**
     * Only routes can implement shortcuts.
     * If you need to trigger actions on the controller,
     * simply call them with `this.get('controller').send('action')`.
     *
     * To implement shortcuts, add this mixin to your `extend()`,
     * and implement a `shortcuts` hash.
     * In this hash, keys are shortcut combinations and values are route action names.
     *  (see [keymaster docs](https://github.com/madrobby/keymaster/blob/master/README.markdown)),
     *
     * ```javascript
     * shortcuts: {
     *     'ctrl+s, command+s': 'save',
     *     'ctrl+alt+z': 'toggleZenMode'
     * }
     * ```
     * For more complex actions, shortcuts can instead have their value
     * be an object like {action, options}
     * ```javascript
     * shortcuts: {
     *      'ctrl+k': {action: 'markdownShortcut', options: 'createLink'}
     * }
     * ```
     * You can set the scope of your shortcut by passing a scope property.
     * ```javascript
     * shortcuts : {
     *   'enter': {action : 'confirmModal', scope: 'modal'}
     * }
     * ```
     * If you don't specify a scope, we use a default scope called "default".
     * To have all your shortcut work in all scopes, give it the scope "all".
     * Find out more at the keymaster docs
     */
    var ShortcutsRoute = Ember.Mixin.create({
        registerShortcuts: function () {
            var self = this,
                shortcuts = this.get('shortcuts');

            Ember.keys(shortcuts).forEach(function (shortcut) {
                var scope = shortcuts[shortcut].scope || 'default',
                    action = shortcuts[shortcut],
                    options;

                if (Ember.typeOf(action) !== 'string') {
                    options = action.options;
                    action = action.action;
                }

                key(shortcut, scope, function (event) {
                    // stop things like ctrl+s from actually opening a save dialogue
                    event.preventDefault();
                    self.send(action, options);
                });
            });
        },

        removeShortcuts: function () {
            var shortcuts = this.get('shortcuts');

            Ember.keys(shortcuts).forEach(function (shortcut) {
                key.unbind(shortcut);
            });
        },

        activate: function () {
            this._super();
            this.registerShortcuts();
        },

        deactivate: function () {
            this._super();
            this.removeShortcuts();
        }
    });

    __exports__["default"] = ShortcutsRoute;
  });
define("ghost/mixins/style-body", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // mixin used for routes that need to set a css className on the body tag

    var styleBody = Ember.Mixin.create({
        activate: function () {
            this._super();

            var cssClasses = this.get('classNames');

            if (cssClasses) {
                Ember.run.schedule('afterRender', null, function () {
                    cssClasses.forEach(function (curClass) {
                        Ember.$('body').addClass(curClass);
                    });
                });
            }
        },

        deactivate: function () {
            this._super();

            var cssClasses = this.get('classNames');

            Ember.run.schedule('afterRender', null, function () {
                cssClasses.forEach(function (curClass) {
                    Ember.$('body').removeClass(curClass);
                });
            });
        }
    });

    __exports__["default"] = styleBody;
  });
define("ghost/mixins/text-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var BlurField = Ember.Mixin.create({
        selectOnClick: false,
        stopEnterKeyDownPropagation: false,

        click: function (event) {
            if (this.get('selectOnClick')) {
                event.currentTarget.select();
            }
        },

        keyDown: function (event) {
            // stop event propagation when pressing "enter"
            // most useful in the case when undesired (global) keyboard shortcuts are getting triggered while interacting
            // with this particular input element.
            if (this.get('stopEnterKeyDownPropagation') && event.keyCode === 13) {
                event.stopPropagation();

                return true;
            }
        }
    });

    __exports__["default"] = BlurField;
  });
define("ghost/mixins/validation-engine", 
  ["ghost/utils/ajax","ghost/utils/validator-extensions","ghost/validators/post","ghost/validators/setup","ghost/validators/signup","ghost/validators/signin","ghost/validators/forgotten","ghost/validators/setting","ghost/validators/reset","ghost/validators/user","ghost/validators/tag-settings","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __dependency11__, __exports__) {
    "use strict";
    var getRequestErrorMessage = __dependency1__.getRequestErrorMessage;

    var ValidatorExtensions = __dependency2__["default"];
    var PostValidator = __dependency3__["default"];
    var SetupValidator = __dependency4__["default"];
    var SignupValidator = __dependency5__["default"];
    var SigninValidator = __dependency6__["default"];
    var ForgotValidator = __dependency7__["default"];
    var SettingValidator = __dependency8__["default"];
    var ResetValidator = __dependency9__["default"];
    var UserValidator = __dependency10__["default"];
    var TagSettingsValidator = __dependency11__["default"];

    // our extensions to the validator library
    ValidatorExtensions.init();

    // format errors to be used in `notifications.showErrors`.
    // result is [{message: 'concatenated error messages'}]
    function formatErrors(errors, opts) {
        var message = 'There was an error';

        opts = opts || {};

        if (opts.wasSave && opts.validationType) {
            message += ' saving this ' + opts.validationType;
        }

        if (Ember.isArray(errors)) {
            // get the validator's error messages from the array.
            // normalize array members to map to strings.
            message = errors.map(function (error) {
                if (typeof error === 'string') {
                    return error;
                }

                return error.message;
            }).join('<br />');
        } else if (errors instanceof Error) {
            message += errors.message || '.';
        } else if (typeof errors === 'object') {
            // Get messages from server response
            message += ': ' + getRequestErrorMessage(errors, true);
        } else if (typeof errors === 'string') {
            message += ': ' + errors;
        } else {
            message += '.';
        }

        // set format for notifications.showErrors
        message = [{message: message}];

        return message;
    }

    /**
    * The class that gets this mixin will receive these properties and functions.
    * It will be able to validate any properties on itself (or the model it passes to validate())
    * with the use of a declared validator.
    */
    var ValidationEngine = Ember.Mixin.create({
        // these validators can be passed a model to validate when the class that
        // mixes in the ValidationEngine declares a validationType equal to a key on this object.
        // the model is either passed in via `this.validate({ model: object })`
        // or by calling `this.validate()` without the model property.
        // in that case the model will be the class that the ValidationEngine
        // was mixed into, i.e. the controller or Ember Data model.
        validators: {
            post: PostValidator,
            setup: SetupValidator,
            signup: SignupValidator,
            signin: SigninValidator,
            forgotten: ForgotValidator,
            setting: SettingValidator,
            reset: ResetValidator,
            user: UserValidator,
            tag: TagSettingsValidator
        },

        /**
        * Passses the model to the validator specified by validationType.
        * Returns a promise that will resolve if validation succeeds, and reject if not.
        * Some options can be specified:
        *
        * `format: false` - doesn't use formatErrors to concatenate errors for notifications.showErrors.
        *                   will return whatever the specified validator returns.
        *                   since notifications are a common usecase, `format` is true by default.
        *
        * `model: Object` - you can specify the model to be validated, rather than pass the default value of `this`,
        *                   the class that mixes in this mixin.
        */
        validate: function (opts) {
            var model = opts.model || this,
                type = this.get('validationType'),
                validator = this.get('validators.' + type);

            opts = opts || {};
            opts.validationType = type;

            return new Ember.RSVP.Promise(function (resolve, reject) {
                var validationErrors;

                if (!type || !validator) {
                    validationErrors = ['The validator specified, "' + type + '", did not exist!'];
                } else {
                    validationErrors = validator.check(model);
                }

                if (Ember.isEmpty(validationErrors)) {
                    return resolve();
                }

                if (opts.format !== false) {
                    validationErrors = formatErrors(validationErrors, opts);
                }

                return reject(validationErrors);
            });
        },

        /**
        * The primary goal of this method is to override the `save` method on Ember Data models.
        * This allows us to run validation before actually trying to save the model to the server.
        * You can supply options to be passed into the `validate` method, since the ED `save` method takes no options.
        */
        save: function (options) {
            var self = this,
                // this is a hack, but needed for async _super calls.
                // ref: https://github.com/emberjs/ember.js/pull/4301
                _super = this.__nextSuper;

            options = options || {};
            options.wasSave = true;

            // model.destroyRecord() calls model.save() behind the scenes.
            // in that case, we don't need validation checks or error propagation,
            // because the model itself is being destroyed.
            if (this.get('isDeleted')) {
                return this._super();
            }

            // If validation fails, reject with validation errors.
            // If save to the server fails, reject with server response.
            return this.validate(options).then(function () {
                return _super.call(self, options);
            }).catch(function (result) {
                // server save failed - validate() would have given back an array
                if (!Ember.isArray(result)) {
                    if (options.format !== false) {
                        // concatenate all errors into an array with a single object: [{message: 'concatted message'}]
                        result = formatErrors(result, options);
                    } else {
                        // return the array of errors from the server
                        result = getRequestErrorMessage(result);
                    }
                }

                return Ember.RSVP.reject(result);
            });
        }
    });

    __exports__["default"] = ValidationEngine;
  });
define("ghost/models/notification", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Notification = DS.Model.extend({
        dismissible: DS.attr('boolean'),
        location: DS.attr('string'),
        status: DS.attr('string'),
        type: DS.attr('string'),
        message: DS.attr('string')
    });

    __exports__["default"] = Notification;
  });
define("ghost/models/post", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];

    var Post = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'post',

        uuid: DS.attr('string'),
        title: DS.attr('string', {defaultValue: ''}),
        slug: DS.attr('string'),
        markdown: DS.attr('string', {defaultValue: ''}),
        html: DS.attr('string'),
        image: DS.attr('string'),
        featured: DS.attr('boolean', {defaultValue: false}),
        page: DS.attr('boolean', {defaultValue: false}),
        status: DS.attr('string', {defaultValue: 'draft'}),
        language: DS.attr('string', {defaultValue: 'en_US'}),
        meta_title: DS.attr('string'),
        meta_description: DS.attr('string'),
        author: DS.belongsTo('user',  {async: true}),
        author_id: DS.attr('number'),
        updated_at: DS.attr('moment-date'),
        updated_by: DS.attr(),
        published_at: DS.attr('moment-date'),
        published_by: DS.belongsTo('user', {async: true}),
        created_at: DS.attr('moment-date'),
        created_by: DS.attr(),
        tags: DS.hasMany('tag', {embedded: 'always'}),
        url: DS.attr('string'),

        scratch: null,
        titleScratch: null,

        // Computed post properties

        isPublished: Ember.computed.equal('status', 'published'),
        isDraft: Ember.computed.equal('status', 'draft'),

        // remove client-generated tags, which have `id: null`.
        // Ember Data won't recognize/update them automatically
        // when returned from the server with ids.
        updateTags: function () {
            var tags = this.get('tags'),
                oldTags = tags.filterBy('id', null);

            tags.removeObjects(oldTags);
            oldTags.invoke('deleteRecord');
        },

        isAuthoredByUser: function (user) {
            return parseInt(user.get('id'), 10) === parseInt(this.get('author_id'), 10);
        }

    });

    __exports__["default"] = Post;
  });
define("ghost/models/role", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Role = DS.Model.extend({
        uuid: DS.attr('string'),
        name: DS.attr('string'),
        description: DS.attr('string'),
        created_at: DS.attr('moment-date'),
        updated_at: DS.attr('moment-date'),
        created_by: DS.attr(),
        updated_by: DS.attr(),

        lowerCaseName: Ember.computed('name', function () {
            return this.get('name').toLocaleLowerCase();
        })
    });

    __exports__["default"] = Role;
  });
define("ghost/models/setting", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];

    var Setting = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'setting',

        title: DS.attr('string'),
        description: DS.attr('string'),
        email: DS.attr('string'),
        logo: DS.attr('string'),
        cover: DS.attr('string'),
        defaultLang: DS.attr('string'),
        postsPerPage: DS.attr('number'),
        forceI18n: DS.attr('boolean'),
        permalinks: DS.attr('string'),
        activeTheme: DS.attr('string'),
        availableThemes: DS.attr(),
        ghost_head: DS.attr('string'),
        ghost_foot: DS.attr('string'),
        labs: DS.attr('string')
    });

    __exports__["default"] = Setting;
  });
define("ghost/models/slug-generator", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SlugGenerator = Ember.Object.extend({
        ghostPaths: null,
        slugType: null,
        value: null,
        toString: function () {
            return this.get('value');
        },
        generateSlug: function (textToSlugify) {
            var self = this,
                url;

            if (!textToSlugify) {
                return Ember.RSVP.resolve('');
            }

            url = this.get('ghostPaths.url').api('slugs', this.get('slugType'), encodeURIComponent(textToSlugify));

            return ic.ajax.request(url, {
                type: 'GET'
            }).then(function (response) {
                var slug = response.slugs[0].slug;
                self.set('value', slug);
                return slug;
            });
        }
    });

    __exports__["default"] = SlugGenerator;
  });
define("ghost/models/tag", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];

    var Tag = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
        validationType: 'tag',

        uuid: DS.attr('string'),
        name: DS.attr('string'),
        slug: DS.attr('string'),
        description: DS.attr('string'),
        parent: DS.attr(),
        meta_title: DS.attr('string'),
        meta_description: DS.attr('string'),
        image: DS.attr('string'),
        hidden: DS.attr('boolean'),
        created_at: DS.attr('moment-date'),
        updated_at: DS.attr('moment-date'),
        created_by: DS.attr(),
        updated_by: DS.attr(),
        post_count: DS.attr('number')
    });

    __exports__["default"] = Tag;
  });
define("ghost/models/user", 
  ["ghost/mixins/validation-engine","ghost/mixins/nprogress-save","ghost/mixins/selective-save","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ValidationEngine = __dependency1__["default"];
    var NProgressSaveMixin = __dependency2__["default"];
    var SelectiveSaveMixin = __dependency3__["default"];

    var User = DS.Model.extend(NProgressSaveMixin, SelectiveSaveMixin, ValidationEngine, {
        validationType: 'user',

        uuid: DS.attr('string'),
        name: DS.attr('string'),
        slug: DS.attr('string'),
        email: DS.attr('string'),
        image: DS.attr('string'),
        cover: DS.attr('string'),
        bio: DS.attr('string'),
        website: DS.attr('string'),
        location: DS.attr('string'),
        accessibility: DS.attr('string'),
        status: DS.attr('string'),
        language: DS.attr('string', {defaultValue: 'en_US'}),
        meta_title: DS.attr('string'),
        meta_description: DS.attr('string'),
        last_login: DS.attr('moment-date'),
        created_at: DS.attr('moment-date'),
        created_by: DS.attr('number'),
        updated_at: DS.attr('moment-date'),
        updated_by: DS.attr('number'),
        roles: DS.hasMany('role', {embedded: 'always'}),

        role: Ember.computed('roles', function (name, value) {
            if (arguments.length > 1) {
                // Only one role per user, so remove any old data.
                this.get('roles').clear();
                this.get('roles').pushObject(value);

                return value;
            }

            return this.get('roles.firstObject');
        }),

        // TODO: Once client-side permissions are in place,
        // remove the hard role check.
        isAuthor: Ember.computed.equal('role.name', 'Author'),
        isEditor: Ember.computed.equal('role.name', 'Editor'),
        isAdmin: Ember.computed.equal('role.name', 'Administrator'),
        isOwner: Ember.computed.equal('role.name', 'Owner'),

        saveNewPassword: function () {
            var url = this.get('ghostPaths.url').api('users', 'password');

            return ic.ajax.request(url, {
                type: 'PUT',
                data: {
                    password: [{
                        user_id: this.get('id'),
                        oldPassword: this.get('password'),
                        newPassword: this.get('newPassword'),
                        ne2Password: this.get('ne2Password')
                    }]
                }
            });
        },

        resendInvite: function () {
            var fullUserData = this.toJSON(),
                userData = {
                    email: fullUserData.email,
                    roles: fullUserData.roles
                };

            return ic.ajax.request(this.get('ghostPaths.url').api('users'), {
                type: 'POST',
                data: JSON.stringify({users: [userData]}),
                contentType: 'application/json'
            });
        },

        passwordValidationErrors: Ember.computed('password', 'newPassword', 'ne2Password', function () {
            var validationErrors = [];

            if (!validator.equals(this.get('newPassword'), this.get('ne2Password'))) {
                validationErrors.push({message: 'Your new passwords do not match'});
            }

            if (!validator.isLength(this.get('newPassword'), 8)) {
                validationErrors.push({message: 'Your password is not long enough. It must be at least 8 characters long.'});
            }

            return validationErrors;
        }),

        isPasswordValid: Ember.computed.empty('passwordValidationErrors.[]'),

        active: function () {
            return ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].indexOf(this.get('status')) > -1;
        }.property('status'),

        invited: function () {
            return ['invited', 'invited-pending'].indexOf(this.get('status')) > -1;
        }.property('status'),

        pending: Ember.computed.equal('status', 'invited-pending').property('status')
    });

    __exports__["default"] = User;
  });
define("ghost/router", 
  ["ghost/utils/ghost-paths","ghost/utils/document-title","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];
    var documentTitle = __dependency2__["default"];

    var Router = Ember.Router.extend({
        location: 'trailing-history', // use HTML5 History API instead of hash-tag based URLs
        rootURL: ghostPaths().adminRoot, // admin interface lives under sub-directory /ghost

        clearNotifications: Ember.on('didTransition', function () {
            this.notifications.closePassive();
            this.notifications.displayDelayed();
        })
    });

    documentTitle();

    Router.map(function () {
        this.route('setup');
        this.route('signin');
        this.route('signout');
        this.route('signup', {path: '/signup/:token'});
        this.route('forgotten');
        this.route('reset', {path: '/reset/:token'});

        this.resource('posts', {path: '/'}, function () {
            this.route('post', {path: ':post_id'});
        });

        this.resource('editor', function () {
            this.route('new', {path: ''});
            this.route('edit', {path: ':post_id'});
        });

        this.resource('settings', function () {
            this.route('general');

            this.resource('settings.users', {path: '/users'}, function () {
                this.route('user', {path: '/:slug'});
            });

            this.route('about');
            this.route('tags');
            this.route('labs');
            this.route('code-injection');
        });

        // Redirect debug to settings labs
        this.route('debug');

        // Redirect legacy content to posts
        this.route('content');

        this.route('error404', {path: '/*path'});
    });

    __exports__["default"] = Router;
  });
define("ghost/routes/application", 
  ["ghost/mixins/shortcuts-route","ghost/utils/ctrl-or-cmd","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /* global key */
    var ShortcutsRoute = __dependency1__["default"];
    var ctrlOrCmd = __dependency2__["default"];

    var ApplicationRoute,
        shortcuts = {};

    shortcuts.esc = {action: 'closePopups', scope: 'all'};
    shortcuts.enter = {action: 'confirmModal', scope: 'modal'};
    shortcuts[ctrlOrCmd + '+s'] = {action: 'save', scope: 'all'};

    ApplicationRoute = Ember.Route.extend(SimpleAuth.ApplicationRouteMixin, ShortcutsRoute, {
        shortcuts: shortcuts,

        afterModel: function (model, transition) {
            if (this.get('session').isAuthenticated) {
                transition.send('loadServerNotifications');
            }
        },

        title: function (tokens) {
            return tokens.join(' - ') + ' - ' + this.get('config.blogTitle');
        },

        actions: {
            toggleGlobalMobileNav: function () {
                this.toggleProperty('controller.showGlobalMobileNav');
            },

            openSettingsMenu: function () {
                this.set('controller.showSettingsMenu', true);
            },

            closeSettingsMenu: function () {
                this.set('controller.showSettingsMenu', false);
            },

            toggleSettingsMenu: function () {
                this.toggleProperty('controller.showSettingsMenu');
            },

            closePopups: function () {
                this.get('dropdown').closeDropdowns();
                this.get('notifications').closeAll();

                // Close right outlet if open
                this.send('closeSettingsMenu');

                this.send('closeModal');
            },

            signedIn: function () {
                this.send('loadServerNotifications', true);
            },

            sessionAuthenticationFailed: function (error) {
                if (error.errors) {
                    this.notifications.showErrors(error.errors);
                } else {
                    // connection errors don't return proper status message, only req.body
                    this.notifications.showError('There was a problem on the server.');
                }
            },

            sessionAuthenticationSucceeded: function () {
                var appController = this.controllerFor('application'),
                    self = this;

                if (appController && appController.get('skipAuthSuccessHandler')) {
                    return;
                }

                this.store.find('user', 'me').then(function (user) {
                    self.send('signedIn', user);
                    var attemptedTransition = self.get('session').get('attemptedTransition');
                    if (attemptedTransition) {
                        attemptedTransition.retry();
                        self.get('session').set('attemptedTransition', null);
                    } else {
                        self.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
                    }
                });
            },

            sessionInvalidationFailed: function (error) {
                this.notifications.showError(error.message);
            },

            openModal: function (modalName, model, type) {
                this.get('dropdown').closeDropdowns();
                key.setScope('modal');
                modalName = 'modals/' + modalName;
                this.set('modalName', modalName);

                // We don't always require a modal to have a controller
                // so we're skipping asserting if one exists
                if (this.controllerFor(modalName, true)) {
                    this.controllerFor(modalName).set('model', model);

                    if (type) {
                        this.controllerFor(modalName).set('imageType', type);
                        this.controllerFor(modalName).set('src', model.get(type));
                    }
                }

                return this.render(modalName, {
                    into: 'application',
                    outlet: 'modal'
                });
            },

            confirmModal: function () {
                var modalName = this.get('modalName');

                this.send('closeModal');

                if (this.controllerFor(modalName, true)) {
                    this.controllerFor(modalName).send('confirmAccept');
                }
            },

            closeModal: function () {
                this.disconnectOutlet({
                    outlet: 'modal',
                    parentView: 'application'
                });

                key.setScope('default');
            },

            loadServerNotifications: function (isDelayed) {
                var self = this;

                if (this.session.isAuthenticated) {
                    this.store.findAll('notification').then(function (serverNotifications) {
                        serverNotifications.forEach(function (notification) {
                            self.notifications.handleNotification(notification, isDelayed);
                        });
                    });
                }
            },

            handleErrors: function (errors) {
                var self = this;

                this.notifications.clear();
                errors.forEach(function (errorObj) {
                    self.notifications.showError(errorObj.message || errorObj);

                    if (errorObj.hasOwnProperty('el')) {
                        errorObj.el.addClass('input-error');
                    }
                });
            },

            // noop default for unhandled save (used from shortcuts)
            save: Ember.K
        }
    });

    __exports__["default"] = ApplicationRoute;
  });
define("ghost/routes/authenticated", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var AuthenticatedRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin);

    __exports__["default"] = AuthenticatedRoute;
  });
define("ghost/routes/content", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ContentRoute = Ember.Route.extend({
        beforeModel: function () {
            this.transitionTo('posts');
        }
    });

    __exports__["default"] = ContentRoute;
  });
define("ghost/routes/debug", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DebugRoute = Ember.Route.extend({
        beforeModel: function () {
            this.transitionTo('settings.labs');
        }
    });

    __exports__["default"] = DebugRoute;
  });
define("ghost/routes/editor/edit", 
  ["ghost/routes/authenticated","ghost/mixins/editor-base-route","ghost/utils/isNumber","ghost/utils/isFinite","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var base = __dependency2__["default"];
    var isNumber = __dependency3__["default"];
    var isFinite = __dependency4__["default"];

    var EditorEditRoute = AuthenticatedRoute.extend(base, {
        titleToken: 'Editor',

        model: function (params) {
            var self = this,
                post,
                postId,
                query;

            postId = Number(params.post_id);

            if (!isNumber(postId) || !isFinite(postId) || postId % 1 !== 0 || postId <= 0) {
                return this.transitionTo('error404', 'editor/' + params.post_id);
            }

            post = this.store.getById('post', postId);
            if (post) {
                return post;
            }

            query = {
                id: postId,
                status: 'all',
                staticPages: 'all'
            };

            return self.store.find('post', query).then(function (records) {
                var post = records.get('firstObject');

                if (post) {
                    return post;
                }

                return self.replaceWith('posts.index');
            });
        },

        afterModel: function (post) {
            var self = this;

            return self.store.find('user', 'me').then(function (user) {
                if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                    return self.replaceWith('posts.index');
                }
            });
        },

        actions: {
             authorizationFailed: function () {
                this.send('openModal', 'signin');
            }
        }
    });

    __exports__["default"] = EditorEditRoute;
  });
define("ghost/routes/editor/index", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var EditorRoute = Ember.Route.extend({
        beforeModel: function () {
            this.transitionTo('editor.new');
        }
    });

    __exports__["default"] = EditorRoute;
  });
define("ghost/routes/editor/new", 
  ["ghost/routes/authenticated","ghost/mixins/editor-base-route","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var base = __dependency2__["default"];

    var EditorNewRoute = AuthenticatedRoute.extend(base, {
        titleToken: 'Editor',

        model: function () {
            var self = this;
            return this.get('session.user').then(function (user) {
                return self.store.createRecord('post', {
                    author: user
                });
            });
        },

        setupController: function (controller, model) {
            var psm = this.controllerFor('post-settings-menu');

            // make sure there are no titleObserver functions hanging around
            // from previous posts
            psm.removeObserver('titleScratch', psm, 'titleObserver');

            // Ensure that the PSM Image Uploader and Publish Date selector resets
            psm.send('resetUploader');
            psm.send('resetPubDate');

            this._super(controller, model);
        }
    });

    __exports__["default"] = EditorNewRoute;
  });
define("ghost/routes/error404", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Error404Route = Ember.Route.extend({
        controllerName: 'error',
        templateName: 'error',
        titleToken: 'Error',

        model: function () {
            return {
                status: 404
            };
        }
    });

    __exports__["default"] = Error404Route;
  });
define("ghost/routes/forgotten", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var ForgottenRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        titleToken: 'Forgotten Password',

        classNames: ['ghost-forgotten']
    });

    __exports__["default"] = ForgottenRoute;
  });
define("ghost/routes/mobile-index-route", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    // Routes that extend MobileIndexRoute need to implement
    // desktopTransition, a function which is called when
    // the user resizes to desktop levels.
    var MobileIndexRoute = Ember.Route.extend({
        desktopTransition: Ember.K,

        activate: function attachDesktopTransition() {
            this._super();
            mobileQuery.addListener(this.desktopTransitionMQ);
        },

        deactivate: function removeDesktopTransition() {
            this._super();
            mobileQuery.removeListener(this.desktopTransitionMQ);
        },

        setDesktopTransitionMQ: function () {
            var self = this;
            this.set('desktopTransitionMQ', function desktopTransitionMQ() {
                if (!mobileQuery.matches) {
                    self.desktopTransition();
                }
            });
        }.on('init')
    });

    __exports__["default"] = MobileIndexRoute;
  });
define("ghost/routes/posts", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/shortcuts-route","ghost/mixins/loading-indicator","ghost/mixins/pagination-route","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var ShortcutsRoute = __dependency3__["default"];
    var loadingIndicator = __dependency4__["default"];
    var PaginationRouteMixin = __dependency5__["default"];

    var paginationSettings,
        PostsRoute;

    paginationSettings = {
        status: 'all',
        staticPages: 'all',
        page: 1
    };

    PostsRoute = AuthenticatedRoute.extend(ShortcutsRoute, styleBody, loadingIndicator, PaginationRouteMixin, {
        titleToken: 'Content',

        classNames: ['manage'],

        model: function () {
            var self = this;

            return this.store.find('user', 'me').then(function (user) {
                if (user.get('isAuthor')) {
                    paginationSettings.author = user.get('slug');
                }

                // using `.filter` allows the template to auto-update when new models are pulled in from the server.
                // we just need to 'return true' to allow all models by default.
                return self.store.filter('post', paginationSettings, function (post) {
                    if (user.get('isAuthor')) {
                        return post.isAuthoredByUser(user);
                    }

                    return true;
                });
            });
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        stepThroughPosts: function (step) {
            var currentPost = this.get('controller.currentPost'),
                posts = this.get('controller.arrangedContent'),
                length = posts.get('length'),
                newPosition;

            newPosition = posts.indexOf(currentPost) + step;

            // if we are on the first or last item
            // just do nothing (desired behavior is to not
            // loop around)
            if (newPosition >= length) {
                return;
            } else if (newPosition < 0) {
                return;
            }

            this.transitionTo('posts.post', posts.objectAt(newPosition));
        },

        scrollContent: function (amount) {
            var content = Ember.$('.js-content-preview'),
                scrolled = content.scrollTop();

            content.scrollTop(scrolled + 50 * amount);
        },

        shortcuts: {
            'up, k': 'moveUp',
            'down, j': 'moveDown',
            left: 'focusList',
            right: 'focusContent',
            c: 'newPost'
        },

        actions: {
            focusList: function () {
                this.controller.set('keyboardFocus', 'postList');
            },
            focusContent: function () {
                this.controller.set('keyboardFocus', 'postContent');
            },
            newPost: function () {
                this.transitionTo('editor.new');
            },

            moveUp: function () {
                if (this.controller.get('postContentFocused')) {
                    this.scrollContent(-1);
                } else {
                    this.stepThroughPosts(-1);
                }
            },

            moveDown: function () {
                if (this.controller.get('postContentFocused')) {
                    this.scrollContent(1);
                } else {
                    this.stepThroughPosts(1);
                }
            }
        }
    });

    __exports__["default"] = PostsRoute;
  });
define("ghost/routes/posts/index", 
  ["ghost/routes/mobile-index-route","ghost/mixins/loading-indicator","ghost/utils/mobile","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var MobileIndexRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var mobileQuery = __dependency3__["default"];

    var PostsIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
        noPosts: false,

        // Transition to a specific post if we're not on mobile
        beforeModel: function () {
            if (!mobileQuery.matches) {
                return this.goToPost();
            }
        },

        setupController: function (controller, model) {
            /*jshint unused:false*/
            controller.set('noPosts', this.get('noPosts'));
        },

        goToPost: function () {
            var self = this,
                // the store has been populated by PostsRoute
                posts = this.store.all('post'),
                post;

            return this.store.find('user', 'me').then(function (user) {
                post = posts.find(function (post) {
                    // Authors can only see posts they've written
                    if (user.get('isAuthor')) {
                        return post.isAuthoredByUser(user);
                    }

                    return true;
                });

                if (post) {
                    return self.transitionTo('posts.post', post);
                }

                self.set('noPosts', true);
            });
        },

        // Mobile posts route callback
        desktopTransition: function () {
            this.goToPost();
        }
    });

    __exports__["default"] = PostsIndexRoute;
  });
define("ghost/routes/posts/post", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/shortcuts-route","ghost/utils/isNumber","ghost/utils/isFinite","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var ShortcutsRoute = __dependency3__["default"];
    var isNumber = __dependency4__["default"];
    var isFinite = __dependency5__["default"];

    var PostsPostRoute = AuthenticatedRoute.extend(loadingIndicator, ShortcutsRoute, {
        model: function (params) {
            var self = this,
                post,
                postId,
                query;

            postId = Number(params.post_id);

            if (!isNumber(postId) || !isFinite(postId) || postId % 1 !== 0 || postId <= 0) {
                return this.transitionTo('error404', params.post_id);
            }

            post = this.store.getById('post', postId);
            if (post) {
                return post;
            }

            query = {
                id: postId,
                status: 'all',
                staticPages: 'all'
            };

            return self.store.find('post', query).then(function (records) {
                var post = records.get('firstObject');

                if (post) {
                    return post;
                }

                return self.replaceWith('posts.index');
            });
        },

        afterModel: function (post) {
            var self = this;

            return self.store.find('user', 'me').then(function (user) {
                if (user.get('isAuthor') && !post.isAuthoredByUser(user)) {
                    return self.replaceWith('posts.index');
                }
            });
        },

        setupController: function (controller, model) {
            this._super(controller, model);

            this.controllerFor('posts').set('currentPost', model);
        },

        shortcuts: {
            'enter, o': 'openEditor',
            'command+backspace, ctrl+backspace': 'deletePost'
        },

        actions: {
            openEditor: function () {
                this.transitionTo('editor.edit', this.get('controller.model'));
            },

            deletePost: function () {
                this.send('openModal', 'delete-post', this.get('controller.model'));
            }
        }
    });

    __exports__["default"] = PostsPostRoute;
  });
define("ghost/routes/reset", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var ResetRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-reset'],

        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.notifications.showWarn('You can\'t reset your password while you\'re signed in.', {delayed: true});
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        setupController: function (controller, params) {
            controller.token = params.token;
        },

        // Clear out any sensitive information
        deactivate: function () {
            this._super();
            this.controller.clearData();
        }
    });

    __exports__["default"] = ResetRoute;
  });
define("ghost/routes/settings", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];

    var SettingsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
        titleToken: 'Settings',

        classNames: ['settings']
    });

    __exports__["default"] = SettingsRoute;
  });
define("ghost/routes/settings/about", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var styleBody = __dependency3__["default"];

    var SettingsAboutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
        titleToken: 'About',

        classNames: ['settings-view-about'],

        cachedConfig: false,
        model: function () {
            var cachedConfig = this.get('cachedConfig'),
                self = this;
            if (cachedConfig) {
                return cachedConfig;
            }

            return ic.ajax.request(this.get('ghostPaths.url').api('configuration'))
                .then(function (configurationResponse) {
                    var configKeyValues = configurationResponse.configuration;
                    cachedConfig = {};
                    configKeyValues.forEach(function (configKeyValue) {
                        cachedConfig[configKeyValue.key] = configKeyValue.value;
                    });
                    self.set('cachedConfig', cachedConfig);
                    return cachedConfig;
                });
        }
    });

    __exports__["default"] = SettingsAboutRoute;
  });
define("ghost/routes/settings/apps", 
  ["ghost/routes/authenticated","ghost/mixins/current-user-settings","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];
    var styleBody = __dependency3__["default"];

    var AppsRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
        titleToken: 'Apps',

        classNames: ['settings-view-apps'],

        beforeModel: function () {
            if (!this.get('config.apps')) {
                return this.transitionTo('settings.general');
            }

            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor());
        },

        model: function () {
            return this.store.find('app');
        }
    });

    __exports__["default"] = AppsRoute;
  });
define("ghost/routes/settings/code-injection", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/current-user-settings","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var CurrentUserSettings = __dependency3__["default"];
    var styleBody = __dependency4__["default"];

    var SettingsCodeInjectionRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
        classNames: ['settings-view-code'],

        beforeModel: function () {
            var feature = this.controllerFor('feature'),
                self = this;

            if (!feature) {
                this.generateController('feature');
                feature = this.controllerFor('feature');
            }

            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor())
                .then(function () {
                    return feature.then(function () {
                        if (!feature.get('codeInjectionUI')) {
                            return self.transitionTo('settings.general');
                        }
                    });
                });
        },

        model: function () {
            return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
                return records.get('firstObject');
            });
        },

        actions: {
            save: function () {
                this.get('controller').send('save');
            }
        }
    });

    __exports__["default"] = SettingsCodeInjectionRoute;
  });
define("ghost/routes/settings/general", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/current-user-settings","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var CurrentUserSettings = __dependency3__["default"];
    var styleBody = __dependency4__["default"];

    var SettingsGeneralRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
        titleToken: 'General',

        classNames: ['settings-view-general'],

        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor());
        },

        model: function () {
            return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
                return records.get('firstObject');
            });
        },

        actions: {
            save: function () {
                this.get('controller').send('save');
            }
        }
    });

    __exports__["default"] = SettingsGeneralRoute;
  });
define("ghost/routes/settings/index", 
  ["ghost/routes/mobile-index-route","ghost/mixins/current-user-settings","ghost/utils/mobile","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var MobileIndexRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];
    var mobileQuery = __dependency3__["default"];

    var SettingsIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, CurrentUserSettings, {
        titleToken: 'Settings',

        // Redirect users without permission to view settings,
        // and show the settings.general route unless the user
        // is mobile
        beforeModel: function () {
            var self = this;
            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor())
                .then(function () {
                    if (!mobileQuery.matches) {
                        self.transitionTo('settings.general');
                    }
                });
        },

        desktopTransition: function () {
            this.transitionTo('settings.general');
        }
    });

    __exports__["default"] = SettingsIndexRoute;
  });
define("ghost/routes/settings/labs", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/current-user-settings","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var CurrentUserSettings = __dependency3__["default"];
    var loadingIndicator = __dependency4__["default"];

    var LabsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
        titleToken: 'Labs',

        classNames: ['settings'],
        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor());
        },

        model: function () {
            return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
                return records.get('firstObject');
            });
        }
    });

    __exports__["default"] = LabsRoute;
  });
define("ghost/routes/settings/tags", 
  ["ghost/routes/authenticated","ghost/mixins/current-user-settings","ghost/mixins/pagination-route","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];
    var PaginationRouteMixin = __dependency3__["default"];

    var TagsRoute,
        paginationSettings;

    paginationSettings = {
        page: 1,
        include: 'post_count',
        limit: 15
    };

    TagsRoute = AuthenticatedRoute.extend(CurrentUserSettings, PaginationRouteMixin, {
        actions: {
            willTransition: function () {
                this.send('closeSettingsMenu');
            }
        },

        titleToken: 'Tags',

        beforeModel: function () {
            var feature = this.controllerFor('feature'),
                self = this;

            if (!feature) {
                this.generateController('feature');
                feature = this.controllerFor('feature');
            }

            return this.currentUser()
                .then(this.transitionAuthor())
                .then(function () {
                    return feature.then(function () {
                        if (!feature.get('tagsUI')) {
                            return self.transitionTo('settings.general');
                        }
                    });
                });
        },

        model: function () {
            this.store.unloadAll('tag');

            return this.store.filter('tag', paginationSettings, function (tag) {
                return !tag.get('isNew');
            });
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        renderTemplate: function (controller, model) {
            this._super(controller, model);
            this.render('settings/tags/settings-menu', {
                into: 'application',
                outlet: 'settings-menu',
                view: 'settings/tags/settings-menu'
            });
        },

        deactivate: function () {
            this.controller.send('resetPagination');
        }
    });

    __exports__["default"] = TagsRoute;
  });
define("ghost/routes/settings/users", 
  ["ghost/routes/authenticated","ghost/mixins/current-user-settings","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];

    var UsersRoute = AuthenticatedRoute.extend(CurrentUserSettings, {
        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor());
        }
    });

    __exports__["default"] = UsersRoute;
  });
define("ghost/routes/settings/users/index", 
  ["ghost/routes/authenticated","ghost/mixins/pagination-route","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var PaginationRouteMixin = __dependency2__["default"];
    var styleBody = __dependency3__["default"];

    var paginationSettings,
        UsersIndexRoute;

    paginationSettings = {
        page: 1,
        limit: 20,
        status: 'active'
    };

    UsersIndexRoute = AuthenticatedRoute.extend(styleBody, PaginationRouteMixin, {
        titleToken: 'Users',

        classNames: ['settings-view-users'],

        setupController: function (controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        model: function () {
            var self = this;

            return self.store.find('user', {limit: 'all', status: 'invited'}).then(function () {
                return self.store.find('user', 'me').then(function (currentUser) {
                    if (currentUser.get('isEditor')) {
                        // Editors only see authors in the list
                        paginationSettings.role = 'Author';
                    }

                    return self.store.filter('user', paginationSettings, function (user) {
                        if (currentUser.get('isEditor')) {
                            return user.get('isAuthor') || user === currentUser;
                        }
                        return true;
                    });
                });
            });
        },

        actions: {
            reload: function () {
                this.refresh();
            }
        }
    });

    __exports__["default"] = UsersIndexRoute;
  });
define("ghost/routes/settings/users/user", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];

    var SettingsUserRoute = AuthenticatedRoute.extend(styleBody, {
        titleToken: 'User',

        classNames: ['settings-view-user'],

        model: function (params) {
            var self = this;
            // TODO: Make custom user adapter that uses /api/users/:slug endpoint
            // return this.store.find('user', { slug: params.slug });

            // Instead, get all the users and then find by slug
            return this.store.find('user').then(function (result) {
                var user = result.findBy('slug', params.slug);

                if (!user) {
                    return self.transitionTo('error404', 'settings/users/' + params.slug);
                }

                return user;
            });
        },

        afterModel: function (user) {
            var self = this;
            this.store.find('user', 'me').then(function (currentUser) {
                var isOwnProfile = user.get('id') === currentUser.get('id'),
                    isAuthor = currentUser.get('isAuthor'),
                    isEditor = currentUser.get('isEditor');
                if (isAuthor && !isOwnProfile) {
                    self.transitionTo('settings.users.user', currentUser);
                } else if (isEditor && !isOwnProfile && !user.get('isAuthor')) {
                    self.transitionTo('settings.users');
                }
            });
        },

        deactivate: function () {
            var model = this.modelFor('settings.users.user');

            // we want to revert any unsaved changes on exit
            if (model && model.get('isDirty')) {
                model.rollback();
            }

            this._super();
        },

        actions: {
            save: function () {
                this.get('controller').send('save');
            }
        }
    });

    __exports__["default"] = SettingsUserRoute;
  });
define("ghost/routes/setup", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SetupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        titleToken: 'Setup',

        classNames: ['ghost-setup'],

        // use the beforeModel hook to check to see whether or not setup has been
        // previously completed.  If it has, stop the transition into the setup page.

        beforeModel: function () {
            var self = this;

            // If user is logged in, setup has already been completed.
            if (this.get('session').isAuthenticated) {
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
                return;
            }

            // If user is not logged in, check the state of the setup process via the API
            return ic.ajax.request(this.get('ghostPaths.url').api('authentication/setup'), {
                type: 'GET'
            }).then(function (result) {
                var setup = result.setup[0].status;

                if (setup) {
                    return self.transitionTo('signin');
                }
            });
        }
    });

    __exports__["default"] = SetupRoute;
  });
define("ghost/routes/signin", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        titleToken: 'Sign In',

        classNames: ['ghost-login'],

        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        // the deactivate hook is called after a route has been exited.
        deactivate: function () {
            this._super();

            // clear the properties that hold the credentials from the controller
            // when we're no longer on the signin screen
            this.controllerFor('signin').setProperties({identification: '', password: ''});
        }
    });

    __exports__["default"] = SigninRoute;
  });
define("ghost/routes/signout", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];

    var SignoutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
        titleToken: 'Sign Out',

        classNames: ['ghost-signout'],

        afterModel: function (model, transition) {
            this.notifications.clear();
            if (Ember.canInvoke(transition, 'send')) {
                transition.send('invalidateSession');
                transition.abort();
            } else {
                this.send('invalidateSession');
            }
        }
    });

    __exports__["default"] = SignoutRoute;
  });
define("ghost/routes/signup", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SignupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-signup'],
        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.notifications.showWarn('You need to sign out to register as a new user.', {delayed: true});
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        model: function (params) {
            var self = this,
                tokenText,
                email,
                model = {},
                re = /^(?:[A-Za-z0-9_\-]{4})*(?:[A-Za-z0-9_\-]{2}|[A-Za-z0-9_\-]{3})?$/;

            return new Ember.RSVP.Promise(function (resolve) {
                if (!re.test(params.token)) {
                    self.notifications.showError('Invalid token.', {delayed: true});

                    return resolve(self.transitionTo('signin'));
                }

                tokenText = atob(params.token);
                email = tokenText.split('|')[1];

                model.email = email;
                model.token = params.token;

                return ic.ajax.request({
                    url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                    type: 'GET',
                    dataType: 'json',
                    data: {
                        email: email
                    }
                }).then(function (response) {
                    if (response && response.invitation && response.invitation[0].valid === false) {
                        self.notifications.showError('The invitation does not exist or is no longer valid.', {delayed: true});

                        return resolve(self.transitionTo('signin'));
                    }

                    resolve(model);
                }).catch(function () {
                    resolve(model);
                });
            });
        },

        deactivate: function () {
            this._super();

            // clear the properties that hold the sensitive data from the controller
            this.controllerFor('signup').setProperties({email: '', password: '', token: ''});
        }
    });

    __exports__["default"] = SignupRoute;
  });
define("ghost/serializers/application", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ApplicationSerializer = DS.RESTSerializer.extend({
        serializeIntoHash: function (hash, type, record, options) {
            // Our API expects an id on the posted object
            options = options || {};
            options.includeId = true;

            // We have a plural root in the API
            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Don't ever pass uuid's
            delete data.uuid;

            hash[root] = [data];
        }
    });

    __exports__["default"] = ApplicationSerializer;
  });
define("ghost/serializers/post", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var PostSerializer = ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {
        // settings for the EmbeddedRecordsMixin.
        attrs: {
            tags: {embedded: 'always'}
        },

        normalize: function (type, hash) {
            // this is to enable us to still access the raw author_id
            // without requiring an extra get request (since it is an
            // async relationship).
            hash.author_id = hash.author;

            return this._super(type, hash);
        },

        extractSingle: function (store, primaryType, payload) {
            var root = this.keyForAttribute(primaryType.typeKey),
                pluralizedRoot = Ember.String.pluralize(primaryType.typeKey);

            // make payload { post: { title: '', tags: [obj, obj], etc. } }.
            // this allows ember-data to pull the embedded tags out again,
            // in the function `updatePayloadWithEmbeddedHasMany` of the
            // EmbeddedRecordsMixin (line: `if (!partial[attribute])`):
            // https://github.com/emberjs/data/blob/master/packages/activemodel-adapter/lib/system/embedded_records_mixin.js#L499
            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];

            return this._super.apply(this, arguments);
        },

        keyForAttribute: function (attr) {
            return attr;
        },

        keyForRelationship: function (relationshipName) {
            // this is a hack to prevent Ember-Data from deleting our `tags` reference.
            // ref: https://github.com/emberjs/data/issues/2051
            // @TODO: remove this once the situation becomes clearer what to do.
            if (relationshipName === 'tags') {
                return 'tag';
            }

            return relationshipName;
        },

        serializeIntoHash: function (hash, type, record, options) {
            options = options || {};
            options.includeId = true;

            // We have a plural root in the API
            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Properties that exist on the model but we don't want sent in the payload

            delete data.uuid;
            delete data.html;
            // Inserted locally as a convenience.
            delete data.author_id;
            // Read-only virtual property.
            delete data.url;

            hash[root] = [data];
        }
    });

    __exports__["default"] = PostSerializer;
  });
define("ghost/serializers/setting", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var SettingSerializer = ApplicationSerializer.extend({
        serializeIntoHash: function (hash, type, record, options) {
            // Settings API does not want ids
            options = options || {};
            options.includeId = false;

            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options),
                payload = [];

            delete data.id;

            Object.keys(data).forEach(function (k) {
                payload.push({key: k, value: data[k]});
            });

            hash[root] = payload;
        },

        extractArray: function (store, type, _payload) {
            var payload = {id: '0'};

            _payload.settings.forEach(function (setting) {
                payload[setting.key] = setting.value;
            });

            return [payload];
        },

        extractSingle: function (store, type, payload) {
            return this.extractArray(store, type, payload).pop();
        }
    });

    __exports__["default"] = SettingSerializer;
  });
define("ghost/serializers/tag", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var TagSerializer = ApplicationSerializer.extend({
        serializeIntoHash: function (hash, type, record, options) {
            options = options || {};
            options.includeId = true;

            var root = Ember.String.pluralize(type.typeKey),
                data = this.serialize(record, options);

            // Properties that exist on the model but we don't want sent in the payload

            delete data.uuid;
            delete data.post_count;

            hash[root] = [data];
        }
    });

    __exports__["default"] = TagSerializer;
  });
define("ghost/serializers/user", 
  ["ghost/serializers/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationSerializer = __dependency1__["default"];

    var UserSerializer = ApplicationSerializer.extend(DS.EmbeddedRecordsMixin, {
        attrs: {
            roles: {embedded: 'always'}
        },

        extractSingle: function (store, primaryType, payload) {
            var root = this.keyForAttribute(primaryType.typeKey),
                pluralizedRoot = Ember.String.pluralize(primaryType.typeKey);

            payload[root] = payload[pluralizedRoot][0];
            delete payload[pluralizedRoot];

            return this._super.apply(this, arguments);
        },

        keyForAttribute: function (attr) {
            return attr;
        },

        keyForRelationship: function (relationshipName) {
            // this is a hack to prevent Ember-Data from deleting our `tags` reference.
            // ref: https://github.com/emberjs/data/issues/2051
            // @TODO: remove this once the situation becomes clearer what to do.
            if (relationshipName === 'roles') {
                return 'role';
            }

            return relationshipName;
        }
    });

    __exports__["default"] = UserSerializer;
  });
define("ghost/transforms/moment-date", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    var MomentDate = DS.Transform.extend({
        deserialize: function (serialized) {
            if (serialized) {
                return moment(serialized);
            }
            return serialized;
        },
        serialize: function (deserialized) {
            if (deserialized) {
                return moment(deserialized).toDate();
            }
            return deserialized;
        }
    });
    __exports__["default"] = MomentDate;
  });
define("ghost/utils/ajax", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global ic */

    var ajax = window.ajax = function () {
        return ic.ajax.request.apply(null, arguments);
    };

    // Used in API request fail handlers to parse a standard api error
    // response json for the message to display
    function getRequestErrorMessage(request, performConcat) {
        var message,
            msgDetail;

        // Can't really continue without a request
        if (!request) {
            return null;
        }

        // Seems like a sensible default
        message = request.statusText;

        // If a non 200 response
        if (request.status !== 200) {
            try {
                // Try to parse out the error, or default to 'Unknown'
                if (request.responseJSON.errors && Ember.isArray(request.responseJSON.errors)) {
                    message = request.responseJSON.errors.map(function (errorItem) {
                        return errorItem.message;
                    });
                } else {
                    message =  request.responseJSON.error || 'Unknown Error';
                }
            } catch (e) {
                msgDetail = request.status ? request.status + ' - ' + request.statusText : 'Server was not available';
                message = 'The server returned an error (' + msgDetail + ').';
            }
        }

        if (performConcat && Ember.isArray(message)) {
            message = message.join('<br />');
        }

        // return an array of errors by default
        if (!performConcat && typeof message === 'string') {
            message = [message];
        }

        return message;
    }

    __exports__.getRequestErrorMessage = getRequestErrorMessage;
    __exports__.ajax = ajax;
    __exports__["default"] = ajax;
  });
define("ghost/utils/bind", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var slice = Array.prototype.slice;

    function bind(/* func, args, thisArg */) {
        var args = slice.call(arguments),
            func = args.shift(),
            thisArg = args.pop();

        function bound() {
            return func.apply(thisArg, args);
        }

        return bound;
    }

    __exports__["default"] = bind;
  });
define("ghost/utils/bound-one-way", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * Defines a property similarly to `Ember.computed.oneway`,
     * save that while a `oneway` loses its binding upon being set,
     * the `BoundOneWay` will continue to listen for upstream changes.
     *
     * This is an ideal tool for working with values inside of {{input}}
     * elements.
     * @param {*} upstream
     * @param {function} transform a function to transform the **upstream** value.
     */
    var BoundOneWay = function (upstream, transform) {
        if (typeof transform !== 'function') {
            // default to the identity function
            transform = function (value) { return value; };
        }

        return Ember.computed(upstream, function (key, value) {
            return arguments.length > 1 ? value : transform(this.get(upstream));
        });
    };

    __exports__["default"] = BoundOneWay;
  });
define("ghost/utils/caja-sanitizers", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     * google-caja uses url() and id() to verify if the values are allowed.
     */
    var url,
        id;

    /**
     * Check if URL is allowed
     * URLs are allowed if they start with http://, https://, or /.
     */
    url = function (url) {
        // jscs:disable
        url = url.toString().replace(/['"]+/g, '');
        if (/^https?:\/\//.test(url) || /^\//.test(url)) {
            return url;
        }
        // jscs:enable
    };

    /**
     * Check if ID is allowed
     * All ids are allowed at the moment.
     */
    id = function (id) {
        return id;
    };

    __exports__["default"] = {
        url: url,
        id: id
    };
  });
define("ghost/utils/codemirror-mobile", 
  ["ghost/assets/lib/touch-editor","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*global CodeMirror, device, FastClick*/
    var createTouchEditor = __dependency1__["default"];

    var setupMobileCodeMirror,
        TouchEditor,
        init;

    setupMobileCodeMirror = function setupMobileCodeMirror() {
        var noop = function () {},
            key;

        for (key in CodeMirror) {
            if (CodeMirror.hasOwnProperty(key)) {
                CodeMirror[key] = noop;
            }
        }

        CodeMirror.fromTextArea = function (el, options) {
            return new TouchEditor(el, options);
        };

        CodeMirror.keyMap = {basic: {}};
    };

    init = function init() {
        // Codemirror does not function on mobile devices, or on any iDevice
        if (device.mobile() || (device.tablet() && device.ios())) {
            $('body').addClass('touch-editor');

            Ember.touchEditor = true;

            // initialize FastClick to remove touch delays
            Ember.run.scheduleOnce('afterRender', null, function () {
                FastClick.attach(document.body);
            });

            TouchEditor = createTouchEditor();
            setupMobileCodeMirror();
        }
    };

    __exports__["default"] = {
        createIfMobile: init
    };
  });
define("ghost/utils/codemirror-shortcuts", 
  ["ghost/utils/titleize","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global CodeMirror, moment, Showdown */
    // jscs:disable disallowSpacesInsideParentheses

    /** Set up a shortcut function to be called via router actions.
     *  See editor-base-route
     */

    var titleize = __dependency1__["default"];

    function init() {
        // remove predefined `ctrl+h` shortcut
        delete CodeMirror.keyMap.emacsy['Ctrl-H'];

        // Used for simple, noncomputational replace-and-go! shortcuts.
        // See default case in shortcut function below.
        CodeMirror.prototype.simpleShortcutSyntax = {
            bold: '**$1**',
            italic: '*$1*',
            strike: '~~$1~~',
            code: '`$1`',
            link: '[$1](http://)',
            image: '![$1](http://)',
            blockquote: '> $1'
        };

        CodeMirror.prototype.shortcut = function (type) {
            var text = this.getSelection(),
                cursor = this.getCursor(),
                line = this.getLine(cursor.line),
                fromLineStart = {line: cursor.line, ch: 0},
                toLineEnd = {line: cursor.line, ch: line.length},
                md, letterCount, textIndex, position, converter,
                generatedHTML, match, currentHeaderLevel, hashPrefix,
                replacementLine;

            switch (type) {
            case 'cycleHeaderLevel':
                match = line.match(/^#+/);

                if (!match) {
                    currentHeaderLevel = 1;
                } else {
                    currentHeaderLevel = match[0].length;
                }

                if (currentHeaderLevel > 2) {
                    currentHeaderLevel = 1;
                }

                hashPrefix = new Array(currentHeaderLevel + 2).join('#');

                // jscs:disable
                replacementLine = hashPrefix + ' ' + line.replace(/^#* /, '');
                // jscs:enable

                this.replaceRange(replacementLine, fromLineStart, toLineEnd);
                this.setCursor(cursor.line, cursor.ch + replacementLine.length);
                break;

            case 'link':
                md = this.simpleShortcutSyntax.link.replace('$1', text);
                this.replaceSelection(md, 'end');
                if (!text) {
                    this.setCursor(cursor.line, cursor.ch + 1);
                } else {
                    textIndex = line.indexOf(text, cursor.ch - text.length);
                    position = textIndex + md.length - 1;
                    this.setSelection({
                        line: cursor.line,
                        ch: position - 7
                    }, {
                        line: cursor.line,
                        ch: position
                    });
                }
                return;

            case 'image':
                md = this.simpleShortcutSyntax.image.replace('$1', text);
                if (line !== '') {
                    md = '\n\n' + md;
                }
                this.replaceSelection(md, 'end');
                cursor = this.getCursor();
                this.setSelection({line: cursor.line, ch: cursor.ch - 8}, {line: cursor.line, ch: cursor.ch - 1});
                return;

            case 'list':
                // jscs:disable
                md = text.replace(/^(\s*)(\w\W*)/gm, '$1* $2');
                // jscs:enable
                this.replaceSelection(md, 'end');
                return;

            case 'currentDate':
                md = moment(new Date()).format('D MMMM YYYY');
                this.replaceSelection(md, 'end');
                return;

            case 'uppercase':
                md = text.toLocaleUpperCase();
                break;

            case 'lowercase':
                md = text.toLocaleLowerCase();
                break;

            case 'titlecase':
                md = titleize(text);
                break;

            case 'copyHTML':
                converter = new Showdown.converter();

                if (text) {
                    generatedHTML = converter.makeHtml(text);
                } else {
                    generatedHTML = converter.makeHtml(this.getValue());
                }

                // Talk to Ember
                this.component.sendAction('openModal', 'copy-html', {generatedHTML: generatedHTML});

                break;

            default:
                if (this.simpleShortcutSyntax[type]) {
                    md = this.simpleShortcutSyntax[type].replace('$1', text);
                }
            }
            if (md) {
                this.replaceSelection(md, 'end');
                if (!text) {
                    letterCount = md.length;
                    this.setCursor({
                        line: cursor.line,
                        ch: cursor.ch + (letterCount / 2)
                    });
                }
            }
        };
    }

    __exports__["default"] = {
        init: init
    };
  });
define("ghost/utils/config-parser", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var isNumeric = function (num) {
            return !isNaN(num);
        },

        _mapType = function (val) {
            if (val === '') {
                return null;
            } else if (val === 'true') {
                return true;
            } else if (val === 'false') {
                return false;
            } else if (isNumeric(val)) {
                return +val;
            } else {
                return val;
            }
        },

        parseConfiguration = function () {
            var metaConfigTags = $('meta[name^="env-"]'),
                propertyName,
                config = {},
                value,
                key,
                i;

            for (i = 0; i < metaConfigTags.length; i += 1) {
                key = $(metaConfigTags[i]).prop('name');
                value = $(metaConfigTags[i]).prop('content');
                propertyName = key.substring(4);        // produce config name ignoring the initial 'env-'.
                config[propertyName] = _mapType(value); // map string values to types if possible
            }
            return config;
        };

    __exports__["default"] = parseConfiguration;
  });
define("ghost/utils/ctrl-or-cmd", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ctrlOrCmd = navigator.userAgent.indexOf('Mac') !== -1 ? 'command' : 'ctrl';

    __exports__["default"] = ctrlOrCmd;
  });
define("ghost/utils/date-formatting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* global moment */
    // jscs: disable disallowSpacesInsideParentheses

    var parseDateFormats,
        displayDateFormat,
        verifyTimeStamp,
        parseDateString,
        formatDate;

    parseDateFormats = ['DD MMM YY @ HH:mm', 'DD MMM YY HH:mm',
                            'DD MMM YYYY @ HH:mm', 'DD MMM YYYY HH:mm',
                            'DD/MM/YY @ HH:mm', 'DD/MM/YY HH:mm',
                            'DD/MM/YYYY @ HH:mm', 'DD/MM/YYYY HH:mm',
                            'DD-MM-YY @ HH:mm', 'DD-MM-YY HH:mm',
                            'DD-MM-YYYY @ HH:mm', 'DD-MM-YYYY HH:mm',
                            'YYYY-MM-DD @ HH:mm', 'YYYY-MM-DD HH:mm',
                            'DD MMM @ HH:mm', 'DD MMM HH:mm'];

    displayDateFormat = 'DD MMM YY @ HH:mm';

    // Add missing timestamps
    verifyTimeStamp = function (dateString) {
        if (dateString && !dateString.slice(-5).match(/\d+:\d\d/)) {
            dateString += ' 12:00';
        }
        return dateString;
    };

    // Parses a string to a Moment
    parseDateString = function (value) {
        return value ? moment(verifyTimeStamp(value), parseDateFormats, true) : undefined;
    };

    // Formats a Date or Moment
    formatDate = function (value) {
        return verifyTimeStamp(value ? moment(value).format(displayDateFormat) : '');
    };

    __exports__.parseDateString = parseDateString;
    __exports__.formatDate = formatDate;
  });
define("ghost/utils/document-title", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var documentTitle = function () {
        Ember.Route.reopen({
            // `titleToken` can either be a static string or a function
            // that accepts a model object and returns a string (or array
            // of strings if there are multiple tokens).
            titleToken: null,

            // `title` can either be a static string or a function
            // that accepts an array of tokens and returns a string
            // that will be the document title. The `collectTitleTokens` action
            // stops bubbling once a route is encountered that has a `title`
            // defined.
            title: null,

            _actions: {
                collectTitleTokens: function (tokens) {
                    var titleToken = this.titleToken,
                        finalTitle;

                    if (typeof this.titleToken === 'function') {
                        titleToken = this.titleToken(this.currentModel);
                    }

                    if (Ember.isArray(titleToken)) {
                        tokens.unshift.apply(this, titleToken);
                    } else if (titleToken) {
                        tokens.unshift(titleToken);
                    }

                    if (this.title) {
                        if (typeof this.title === 'function') {
                            finalTitle = this.title(tokens);
                        } else {
                            finalTitle = this.title;
                        }

                        this.router.setTitle(finalTitle);
                    } else {
                        return true;
                    }
                }
            }
        });

        Ember.Router.reopen({
            updateTitle: function () {
                this.send('collectTitleTokens', []);
            }.on('didTransition'),

            setTitle: function (title) {
                if (Ember.testing) {
                    this._title = title;
                } else {
                    window.document.title = title;
                }
            }
        });
    };

    __exports__["default"] = documentTitle;
  });
define("ghost/utils/dropdown-service", 
  ["ghost/mixins/body-event-listener","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    // This is used by the dropdown initializer (and subsequently popovers) to manage closing & toggling
    var BodyEventListener = __dependency1__["default"];

    var DropdownService = Ember.Object.extend(Ember.Evented, BodyEventListener, {
        bodyClick: function (event) {
            /*jshint unused:false */
            this.closeDropdowns();
        },
        closeDropdowns: function () {
            this.trigger('close');
        },
        toggleDropdown: function (dropdownName, dropdownButton) {
            this.trigger('toggle', {target: dropdownName, button: dropdownButton});
        }
    });

    __exports__["default"] = DropdownService;
  });
define("ghost/utils/editor-shortcuts", 
  ["ghost/utils/ctrl-or-cmd","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ctrlOrCmd = __dependency1__["default"];

    var shortcuts = {};

    // General editor shortcuts
    shortcuts[ctrlOrCmd + '+alt+p'] = 'publish';
    shortcuts['alt+shift+z'] = 'toggleZenMode';

    // CodeMirror Markdown Shortcuts

    // Text
    shortcuts['ctrl+alt+u'] = {action: 'codeMirrorShortcut', options: {type: 'strike'}};
    shortcuts[ctrlOrCmd + '+b'] = {action: 'codeMirrorShortcut', options: {type: 'bold'}};
    shortcuts[ctrlOrCmd + '+i'] = {action: 'codeMirrorShortcut', options: {type: 'italic'}};

    shortcuts['ctrl+u'] = {action: 'codeMirrorShortcut', options: {type: 'uppercase'}};
    shortcuts['ctrl+shift+u'] = {action: 'codeMirrorShortcut', options: {type: 'lowercase'}};
    shortcuts['ctrl+alt+shift+u'] = {action: 'codeMirrorShortcut', options: {type: 'titlecase'}};
    shortcuts[ctrlOrCmd + '+shift+c'] = {action: 'codeMirrorShortcut', options: {type: 'copyHTML'}};
    shortcuts[ctrlOrCmd + '+h'] = {action: 'codeMirrorShortcut', options: {type: 'cycleHeaderLevel'}};

    // Formatting
    shortcuts['ctrl+q'] = {action: 'codeMirrorShortcut', options: {type: 'blockquote'}};
    shortcuts['ctrl+l'] = {action: 'codeMirrorShortcut', options: {type: 'list'}};

    // Insert content
    shortcuts['ctrl+shift+1'] = {action: 'codeMirrorShortcut', options: {type: 'currentDate'}};
    shortcuts[ctrlOrCmd + '+k'] = {action: 'codeMirrorShortcut', options: {type: 'link'}};
    shortcuts[ctrlOrCmd + '+shift+i'] = {action: 'codeMirrorShortcut', options: {type: 'image'}};
    shortcuts[ctrlOrCmd + '+shift+k'] = {action: 'codeMirrorShortcut', options: {type: 'code'}};

    __exports__["default"] = shortcuts;
  });
define("ghost/utils/ghost-paths", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var makeRoute = function (root, args) {
        var slashAtStart,
            slashAtEnd,
            parts,
            route;

        slashAtStart = /^\//;
        slashAtEnd = /\/$/;
        route = root.replace(slashAtEnd, '');
        parts = Array.prototype.slice.call(args, 0);

        parts.forEach(function (part) {
            route = [route, part.replace(slashAtStart, '').replace(slashAtEnd, '')].join('/');
        });
        return route += '/';
    };

    function ghostPaths() {
        var path = window.location.pathname,
            subdir = path.substr(0, path.search('/ghost/')),
            adminRoot = subdir + '/ghost',
            apiRoot = subdir + '/ghost/api/v0.1';

        function assetUrl(src) {
            return subdir + src;
        }

        return {
            subdir: subdir,
            blogRoot: subdir + '/',
            adminRoot: adminRoot,
            apiRoot: apiRoot,

            url: {
                admin: function () {
                    return makeRoute(adminRoot, arguments);
                },

                api: function () {
                    return makeRoute(apiRoot, arguments);
                },

                join: function () {
                    if (arguments.length > 1) {
                        return makeRoute(arguments[0], Array.prototype.slice.call(arguments, 1));
                    } else if (arguments.length === 1) {
                        var arg = arguments[0];
                        return arg.slice(-1) === '/' ? arg : arg + '/';
                    }
                    return '/';
                },

                asset: assetUrl
            }
        };
    }

    __exports__["default"] = ghostPaths;
  });
define("ghost/utils/isFinite", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* globals window */

    // isFinite function from lodash

    function isFinite(value) {
        return window.isFinite(value) && !window.isNaN(parseFloat(value));
    }

    __exports__["default"] = isFinite;
  });
define("ghost/utils/isNumber", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // isNumber function from lodash

    var toString = Object.prototype.toString;

    function isNumber(value) {
        return typeof value === 'number' ||
          value && typeof value === 'object' && toString.call(value) === '[object Number]' || false;
    }

    __exports__["default"] = isNumber;
  });
define("ghost/utils/link-view", 
  [],
  function() {
    "use strict";
    Ember.LinkView.reopen({
        active: Ember.computed('loadedParams', 'resolvedParams', 'routeArgs', function () {
            var isActive = this._super();

            Ember.set(this, 'alternateActive', isActive);

            return isActive;
        }),

        activeClass: Ember.computed('tagName', function () {
            return this.get('tagName') === 'button' ? '' : 'active';
        })
    });
  });
define("ghost/utils/mobile", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var mobileQuery = matchMedia('(max-width: 900px)');

    __exports__["default"] = mobileQuery;
  });
define("ghost/utils/notifications", 
  ["ghost/models/notification","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Notification = __dependency1__["default"];

    var Notifications = Ember.ArrayProxy.extend({
        delayedNotifications: [],
        content: Ember.A(),
        timeout: 3000,

        pushObject: function (object) {
            // object can be either a DS.Model or a plain JS object, so when working with
            // it, we need to handle both cases.

            // make sure notifications have all the necessary properties set.
            if (typeof object.toJSON === 'function') {
                // working with a DS.Model

                if (object.get('location') === '') {
                    object.set('location', 'bottom');
                }
            } else {
                if (!object.location) {
                    object.location = 'bottom';
                }
            }

            this._super(object);
        },
        handleNotification: function (message, delayed) {
            if (!message.status) {
                message.status = 'passive';
            }

            if (!delayed) {
                this.pushObject(message);
            } else {
                this.delayedNotifications.push(message);
            }
        },
        showError: function (message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: 'error',
                message: message
            }, options.delayed);
        },
        showErrors: function (errors, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            for (var i = 0; i < errors.length; i += 1) {
                this.showError(errors[i].message || errors[i], {doNotClosePassive: true});
            }
        },
        showAPIError: function (resp, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            options.defaultErrorText = options.defaultErrorText || 'There was a problem on the server, please try again.';

            if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.error) {
                this.showError(resp.jqXHR.responseJSON.error, options);
            } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                this.showErrors(resp.jqXHR.responseJSON.errors, options);
            } else if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.message) {
                this.showError(resp.jqXHR.responseJSON.message, options);
            } else {
                this.showError(options.defaultErrorText, {doNotClosePassive: true});
            }
        },
        showInfo: function (message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: 'info',
                message: message
            }, options.delayed);
        },
        showSuccess: function (message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: 'success',
                message: message
            }, options.delayed);
        },
        showWarn: function (message, options) {
            options = options || {};

            if (!options.doNotClosePassive) {
                this.closePassive();
            }

            this.handleNotification({
                type: 'warn',
                message: message
            }, options.delayed);
        },
        displayDelayed: function () {
            var self = this;

            self.delayedNotifications.forEach(function (message) {
                self.pushObject(message);
            });
            self.delayedNotifications = [];
        },
        closeNotification: function (notification) {
            var self = this;

            if (notification instanceof Notification) {
                notification.deleteRecord();
                notification.save().finally(function () {
                    self.removeObject(notification);
                });
            } else {
                this.removeObject(notification);
            }
        },
        closePassive: function () {
            this.set('content', this.rejectBy('status', 'passive'));
        },
        closePersistent: function () {
            this.set('content', this.rejectBy('status', 'persistent'));
        },
        closeAll: function () {
            this.clear();
        }
    });

    __exports__["default"] = Notifications;
  });
define("ghost/utils/set-scroll-classname", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // ## scrollShadow
    // This adds a 'scroll' class to the targeted element when the element is scrolled
    // `this` is expected to be a jQuery-wrapped element
    // **target:** The element in which the class is applied. Defaults to scrolled element.
    // **class-name:** The class which is applied.
    // **offset:** How far the user has to scroll before the class is applied.
    var setScrollClassName = function (options) {
        var $target = options.target || this,
            offset = options.offset,
            className = options.className || 'scrolling';

        if (this.scrollTop() > offset) {
            $target.addClass(className);
        } else {
            $target.removeClass(className);
        }
    };

    __exports__["default"] = setScrollClassName;
  });
define("ghost/utils/text-field", 
  [],
  function() {
    "use strict";
    Ember.TextField.reopen({
        attributeBindings: ['autofocus']
    });
  });
define("ghost/utils/titleize", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var lowerWords = ['of', 'a', 'the', 'and', 'an', 'or', 'nor', 'but', 'is', 'if',
                      'then', 'else', 'when', 'at', 'from', 'by', 'on', 'off', 'for',
                      'in', 'out', 'over', 'to', 'into', 'with'];

    function titleize(input) {
        var words = input.split(' ').map(function (word, index) {
            if (index === 0 || lowerWords.indexOf(word) === -1) {
                word = Ember.String.capitalize(word);
            }

            return word;
        });

        return words.join(' ');
    }

    __exports__["default"] = titleize;
  });
define("ghost/utils/validator-extensions", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function init() {
        // Provide a few custom validators
        //
        validator.extend('empty', function (str) {
            return Ember.isBlank(str);
        });

        validator.extend('notContains', function (str, badString) {
            return str.indexOf(badString) === -1;
        });
    }

    __exports__["default"] = {
        init: init
    };
  });
define("ghost/utils/word-count", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // jscs: disable
    function wordCount(s) {
        s = s.replace(/(^\s*)|(\s*$)/gi, ''); // exclude  start and end white-space
        s = s.replace(/[ ]{2,}/gi, ' '); // 2 or more space to 1
        s = s.replace(/\n /gi, '\n'); // exclude newline with a start spacing
        s = s.replace(/\n+/gi, '\n');

        return s.split(/ |\n/).length;
    }

    __exports__["default"] = wordCount;
  });
define("ghost/validators/forgotten", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ForgotValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('email'),
                validationErrors = [];

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: 'Invalid email address'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = ForgotValidator;
  });
define("ghost/validators/new-user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NewUserValidator = Ember.Object.extend({
        check: function (model) {
            var data = model.getProperties('name', 'email', 'password'),
                validationErrors = [];

            if (!validator.isLength(data.name, 1)) {
                validationErrors.push({
                    message: 'Please enter a name.'
                });
            }

            if (!validator.isEmail(data.email)) {
                validationErrors.push({
                    message: 'Invalid Email.'
                });
            }

            if (!validator.isLength(data.password, 8)) {
                validationErrors.push({
                    message: 'Password must be at least 8 characters long.'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = NewUserValidator;
  });
define("ghost/validators/post", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],
                data = model.getProperties('title', 'meta_title', 'meta_description');

            if (validator.empty(data.title)) {
                validationErrors.push({
                    message: 'You must specify a title for the post.'
                });
            }

            if (!validator.isLength(data.meta_title, 0, 150)) {
                validationErrors.push({
                    message: 'Meta Title cannot be longer than 150 characters.'
                });
            }

            if (!validator.isLength(data.meta_description, 0, 200)) {
                validationErrors.push({
                    message: 'Meta Description cannot be longer than 200 characters.'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = PostValidator;
  });
define("ghost/validators/reset", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ResetValidator = Ember.Object.create({
        check: function (model) {
            var p1 = model.get('newPassword'),
                p2 = model.get('ne2Password'),
                validationErrors = [];

            if (!validator.equals(p1, p2)) {
                validationErrors.push({
                    message: 'The two new passwords don\'t match.'
                });
            }

            if (!validator.isLength(p1, 8)) {
                validationErrors.push({
                    message: 'The password is not long enough.'
                });
            }
            return validationErrors;
        }
    });

    __exports__["default"] = ResetValidator;
  });
define("ghost/validators/setting", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],
                title = model.get('title'),
                description = model.get('description'),
                email = model.get('email'),
                postsPerPage = model.get('postsPerPage');

            if (!validator.isLength(title, 0, 150)) {
                validationErrors.push({message: 'Title is too long'});
            }

            if (!validator.isLength(description, 0, 200)) {
                validationErrors.push({message: 'Description is too long'});
            }

            if (!validator.isEmail(email) || !validator.isLength(email, 0, 254)) {
                validationErrors.push({message: 'Supply a valid email address'});
            }

            if (postsPerPage > 1000) {
                validationErrors.push({message: 'The maximum number of posts per page is 1000'});
            }

            if (postsPerPage < 1) {
                validationErrors.push({message: 'The minimum number of posts per page is 1'});
            }

            if (!validator.isInt(postsPerPage)) {
                validationErrors.push({message: 'Posts per page must be a number'});
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SettingValidator;
  });
define("ghost/validators/setup", 
  ["ghost/validators/new-user","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var NewUserValidator = __dependency1__["default"];

    var SetupValidator = NewUserValidator.extend({
        check: function (model) {
            var data = model.getProperties('blogTitle'),
                validationErrors = this._super(model);

            if (!validator.isLength(data.blogTitle, 1)) {
                validationErrors.push({
                    message: 'Please enter a blog title.'
                });
            }

            return validationErrors;
        }
    }).create();

    __exports__["default"] = SetupValidator;
  });
define("ghost/validators/signin", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SigninValidator = Ember.Object.create({
        check: function (model) {
            var data = model.getProperties('identification', 'password'),
                validationErrors = [];

            if (!validator.isEmail(data.identification)) {
                validationErrors.push('Invalid Email');
            }

            if (!validator.isLength(data.password || '', 1)) {
                validationErrors.push('Please enter a password');
            }

            return validationErrors;
        }
    });

    __exports__["default"] = SigninValidator;
  });
define("ghost/validators/signup", 
  ["ghost/validators/new-user","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var NewUserValidator = __dependency1__["default"];

    __exports__["default"] = NewUserValidator.create();
  });
define("ghost/validators/tag-settings", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var TagSettingsValidator = Ember.Object.create({
        check: function (model) {
            var validationErrors = [],
                data = model.getProperties('name', 'meta_title', 'meta_description');

            if (validator.empty(data.name)) {
                validationErrors.push({
                    message: 'You must specify a name for the tag.'
                });
            }

            if (!validator.isLength(data.meta_title, 0, 150)) {
                validationErrors.push({
                    message: 'Meta Title cannot be longer than 150 characters.'
                });
            }

            if (!validator.isLength(data.meta_description, 0, 200)) {
                validationErrors.push({
                    message: 'Meta Description cannot be longer than 200 characters.'
                });
            }

            return validationErrors;
        }
    });

    __exports__["default"] = TagSettingsValidator;
  });
define("ghost/validators/user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var UserValidator = Ember.Object.create({
        check: function (model) {
            var validator = this.validators[model.get('status')];

            if (typeof validator !== 'function') {
                return [];
            }

            return validator(model);
        },

        validators: {
            invited: function (model) {
                var validationErrors = [],
                    email = model.get('email'),
                    roles = model.get('roles');

                if (!validator.isEmail(email)) {
                    validationErrors.push({message: 'Please supply a valid email address'});
                }

                if (roles.length < 1) {
                    validationErrors.push({message: 'Please select a role'});
                }

                return validationErrors;
            },

            active: function (model) {
                var validationErrors = [],
                    name = model.get('name'),
                    bio = model.get('bio'),
                    email = model.get('email'),
                    location = model.get('location'),
                    website = model.get('website');

                if (!validator.isLength(name, 0, 150)) {
                    validationErrors.push({message: 'Name is too long'});
                }

                if (!validator.isLength(bio, 0, 200)) {
                    validationErrors.push({message: 'Bio is too long'});
                }

                if (!validator.isEmail(email)) {
                    validationErrors.push({message: 'Please supply a valid email address'});
                }

                if (!validator.isLength(location, 0, 150)) {
                    validationErrors.push({message: 'Location is too long'});
                }

                if (!Ember.isEmpty(website) &&
                    (!validator.isURL(website, {require_protocol: false}) ||
                    !validator.isLength(website, 0, 2000))) {
                    validationErrors.push({message: 'Website is not a valid url'});
                }

                return validationErrors;
            }
        }
    });

    __exports__["default"] = UserValidator;
  });
define("ghost/views/application", 
  ["ghost/utils/mobile","ghost/utils/bind","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];
    var bind = __dependency2__["default"];

    var ApplicationView = Ember.View.extend({
        elementId: 'container',

        setupGlobalMobileNav: function () {
            // #### Navigating within the sidebar closes it.
            var self = this;
            $('body').on('click tap', '.js-nav-item', function () {
                if (mobileQuery.matches) {
                    self.set('controller.showGlobalMobileNav', false);
                }
            });

            // #### Close the nav if mobile and clicking outside of the nav or not the burger toggle
            $('.js-nav-cover').on('click tap', function () {
                var isOpen = self.get('controller.showGlobalMobileNav');
                if (isOpen) {
                    self.set('controller.showGlobalMobileNav', false);
                }
            });

            // #### Listen to the viewport and change user-menu dropdown triangle classes accordingly
            mobileQuery.addListener(this.swapUserMenuDropdownTriangleClasses);
            this.swapUserMenuDropdownTriangleClasses(mobileQuery);
        }.on('didInsertElement'),

        swapUserMenuDropdownTriangleClasses: function (mq) {
            if (mq.matches) {
                $('.js-user-menu-dropdown-menu').removeClass('dropdown-triangle-top-right ').addClass('dropdown-triangle-bottom');
            } else {
                $('.js-user-menu-dropdown-menu').removeClass('dropdown-triangle-bottom').addClass('dropdown-triangle-top-right');
            }
        },

        showGlobalMobileNavObserver: function () {
            if (this.get('controller.showGlobalMobileNav')) {
                $('body').addClass('global-nav-expanded');
            } else {
                $('body').removeClass('global-nav-expanded');
            }
        }.observes('controller.showGlobalMobileNav'),

        setupCloseNavOnDesktop: function () {
            this.set('closeGlobalMobileNavOnDesktop', bind(function closeGlobalMobileNavOnDesktop(mq) {
                if (!mq.matches) {
                    // Is desktop sized
                    this.set('controller.showGlobalMobileNav', false);
                }
            }, this));

            mobileQuery.addListener(this.closeGlobalMobileNavOnDesktop);
        }.on('didInsertElement'),

        removeCloseNavOnDesktop: function () {
            mobileQuery.removeListener(this.closeGlobalMobileNavOnDesktop);
        }.on('willDestroyElement'),

        toggleSettingsMenuBodyClass: function () {
            $('body').toggleClass('settings-menu-expanded', this.get('controller.showSettingsMenu'));
        }.observes('controller.showSettingsMenu')
    });

    __exports__["default"] = ApplicationView;
  });
define("ghost/views/content-preview-content-view", 
  ["ghost/utils/set-scroll-classname","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];

    var PostContentView = Ember.View.extend({
        classNames: ['content-preview-content'],

        didInsertElement: function () {
            var el = this.$();
            el.on('scroll', Ember.run.bind(el, setScrollClassName, {
                target: el.closest('.content-preview'),
                offset: 10
            }));
        },

        contentObserver: function () {
            this.$().closest('.content-preview').scrollTop(0);
        }.observes('controller.content'),

        willDestroyElement: function () {
            var el = this.$();
            el.off('scroll');
        }
    });

    __exports__["default"] = PostContentView;
  });
define("ghost/views/editor-save-button", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var EditorSaveButtonView = Ember.View.extend({
        templateName: 'editor-save-button',
        tagName: 'section',
        classNames: ['splitbtn', 'js-publish-splitbutton'],

        // Tracks whether we're going to change the state of the post on save
        isDangerous: Ember.computed('controller.model.isPublished', 'controller.willPublish', function () {
            return this.get('controller.model.isPublished') !== this.get('controller.willPublish');
        }),

        publishText: Ember.computed('controller.model.isPublished', function () {
            return this.get('controller.model.isPublished') ? 'Update Post' : 'Publish Now';
        }),

        draftText: Ember.computed('controller.model.isPublished', function () {
            return this.get('controller.model.isPublished') ? 'Unpublish' : 'Save Draft';
        }),

        saveText: Ember.computed('controller.willPublish', function () {
            return this.get('controller.willPublish') ? this.get('publishText') : this.get('draftText');
        })
    });

    __exports__["default"] = EditorSaveButtonView;
  });
define("ghost/views/editor/edit", 
  ["ghost/mixins/editor-base-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorViewMixin = __dependency1__["default"];

    var EditorView = Ember.View.extend(EditorViewMixin, {
        tagName: 'section',
        classNames: ['entry-container']
    });

    __exports__["default"] = EditorView;
  });
define("ghost/views/editor/new", 
  ["ghost/mixins/editor-base-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorViewMixin = __dependency1__["default"];

    var EditorNewView = Ember.View.extend(EditorViewMixin, {
        tagName: 'section',
        templateName: 'editor/edit',
        classNames: ['entry-container']
    });

    __exports__["default"] = EditorNewView;
  });
define("ghost/views/mobile/content-view", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    var MobileContentView = Ember.View.extend({
        // Ensure that loading this view brings it into view on mobile
        showContent: function () {
            if (mobileQuery.matches) {
                this.get('parentView').showContent();
            }
        }.on('didInsertElement')
    });

    __exports__["default"] = MobileContentView;
  });
define("ghost/views/mobile/index-view", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    var MobileIndexView = Ember.View.extend({
        // Ensure that going to the index brings the menu into view on mobile.
        showMenu: function () {
            if (mobileQuery.matches) {
                this.get('parentView').showMenu();
            }
        }.on('didInsertElement')
    });

    __exports__["default"] = MobileIndexView;
  });
define("ghost/views/mobile/parent-view", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    // A mobile parent view needs to implement three methods,
    // showContent, showAll, and showMenu
    // Which are called by MobileIndex and MobileContent views
    var MobileParentView = Ember.View.extend({
        showContent: Ember.K,
        showMenu: Ember.K,
        showAll: Ember.K,

        setChangeLayout: function () {
            var self = this;
            this.set('changeLayout', function changeLayout() {
                if (mobileQuery.matches) {
                    // transitioned to mobile layout, so show content
                    self.showContent();
                } else {
                    // went from mobile to desktop
                    self.showAll();
                }
            });
        }.on('init'),

        attachChangeLayout: function () {
            mobileQuery.addListener(this.changeLayout);
        }.on('didInsertElement'),

        detachChangeLayout: function () {
            mobileQuery.removeListener(this.changeLayout);
        }.on('willDestroyElement')
    });

    __exports__["default"] = MobileParentView;
  });
define("ghost/views/paginated-scroll-box", 
  ["ghost/utils/set-scroll-classname","ghost/mixins/pagination-view-infinite-scroll","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var setScrollClassName = __dependency1__["default"];
    var PaginationViewMixin = __dependency2__["default"];

    var PaginatedScrollBox = Ember.View.extend(PaginationViewMixin, {
        attachScrollClassHandler: function () {
            var el = this.$();
            el.on('scroll', Ember.run.bind(el, setScrollClassName, {
                target: el.closest('.content-list'),
                offset: 10
            }));
        }.on('didInsertElement'),

        detachScrollClassHandler: function () {
            this.$().off('scroll');
        }.on('willDestroyElement')
    });

    __exports__["default"] = PaginatedScrollBox;
  });
define("ghost/views/post-item-view", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostItemView = Ember.View.extend({
        classNameBindings: ['active', 'isFeatured:featured', 'isPage:page'],

        active: null,

        isFeatured: Ember.computed.alias('controller.model.featured'),

        isPage: Ember.computed.alias('controller.model.page'),

        doubleClick: function () {
            this.get('controller').send('openEditor');
        },

        click: function () {
            this.get('controller').send('showPostContent');
        },
        scrollIntoView: function () {
            if (!this.get('active')) {
                return;
            }
            var element = this.$(),
                offset = element.offset().top,
                elementHeight = element.height(),
                container = Ember.$('.js-content-scrollbox'),
                containerHeight = container.height(),
                currentScroll = container.scrollTop(),
                isBelowTop,
                isAboveBottom,
                isOnScreen;

            isAboveBottom = offset < containerHeight;
            isBelowTop = offset > elementHeight;

            isOnScreen = isBelowTop && isAboveBottom;

            if (!isOnScreen) {
                // Scroll so that element is centered in container
                // 40 is the amount of padding on the container
                container.clearQueue().animate({
                    scrollTop: currentScroll + offset - 40 - containerHeight / 2
                });
            }
        },
        removeScrollBehaviour: function () {
            this.removeObserver('active', this, this.scrollIntoView);
        }.on('willDestroyElement'),
        addScrollBehaviour: function () {
            this.addObserver('active', this, this.scrollIntoView);
        }.on('didInsertElement')
    });

    __exports__["default"] = PostItemView;
  });
define("ghost/views/post-tags-input", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var PostTagsInputView = Ember.View.extend({
        tagName: 'section',
        elementId: 'entry-tags',
        classNames: 'publish-bar-inner',
        classNameBindings: ['hasFocus:focused'],

        hasFocus: false,

        keys: {
            BACKSPACE: 8,
            TAB: 9,
            ENTER: 13,
            ESCAPE: 27,
            UP: 38,
            DOWN: 40,
            NUMPAD_ENTER: 108
        },

        didInsertElement: function () {
            this.get('controller').send('loadAllTags');
        },

        willDestroyElement: function () {
            this.get('controller').send('reset');
        },

        overlayStyles: Ember.computed('hasFocus', 'controller.suggestions.length', function () {
            var styles = [],
                leftPos;

            if (this.get('hasFocus') && this.get('controller.suggestions.length')) {
                leftPos = this.$().find('#tags').position().left;
                styles.push('display: block');
                styles.push('left: ' + leftPos + 'px');
            } else {
                styles.push('display: none');
                styles.push('left', 0);
            }

            return styles.join(';');
        }),

        tagInputView: Ember.TextField.extend({
            focusIn: function () {
                this.get('parentView').set('hasFocus', true);
            },

            focusOut: function () {
                this.get('parentView').set('hasFocus', false);
            },

            keyPress: function (event) {
                // listen to keypress event to handle comma key on international keyboard
                var controller = this.get('parentView.controller'),
                    isComma = ','.localeCompare(String.fromCharCode(event.keyCode || event.charCode)) === 0;

                // use localeCompare in case of international keyboard layout
                if (isComma) {
                    event.preventDefault();

                    if (controller.get('selectedSuggestion')) {
                        controller.send('addSelectedSuggestion');
                    } else {
                        controller.send('addNewTag');
                    }
                }
            },

            keyDown: function (event) {
                var controller = this.get('parentView.controller'),
                    keys = this.get('parentView.keys'),
                    hasValue;

                switch (event.keyCode) {
                    case keys.UP:
                        event.preventDefault();
                        controller.send('selectPreviousSuggestion');
                        break;

                    case keys.DOWN:
                        event.preventDefault();
                        controller.send('selectNextSuggestion');
                        break;

                    case keys.TAB:
                    case keys.ENTER:
                    case keys.NUMPAD_ENTER:
                        if (controller.get('selectedSuggestion')) {
                            event.preventDefault();
                            controller.send('addSelectedSuggestion');
                        } else {
                            // allow user to tab out of field if input is empty
                            hasValue = !Ember.isEmpty(this.get('value'));
                            if (hasValue || event.keyCode !== keys.TAB) {
                                event.preventDefault();
                                controller.send('addNewTag');
                            }
                        }
                        break;

                    case keys.BACKSPACE:
                        if (Ember.isEmpty(this.get('value'))) {
                            event.preventDefault();
                            controller.send('deleteLastTag');
                        }
                        break;

                    case keys.ESCAPE:
                        event.preventDefault();
                        controller.send('reset');
                        break;
                }
            }
        }),

        suggestionView: Ember.View.extend({
            tagName: 'li',
            classNameBindings: 'suggestion.selected',

            suggestion: null,

            // we can't use the 'click' event here as the focusOut event on the
            // input will fire first

            mouseDown: function (event) {
                event.preventDefault();
            },

            mouseUp: function (event) {
                event.preventDefault();
                this.get('parentView.controller').send('addTag',
                    this.get('suggestion.tag'));
            }
        }),

        actions: {
            deleteTag: function (tag) {
                // The view wants to keep focus on the input after a click on a tag
                Ember.$('.js-tag-input').focus();
                // Make the controller do the actual work
                this.get('controller').send('deleteTag', tag);
            }
        }
    });

    __exports__["default"] = PostTagsInputView;
  });
define("ghost/views/posts", 
  ["ghost/views/mobile/parent-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileParentView = __dependency1__["default"];

    var PostsView = MobileParentView.extend({
        classNames: ['content-view-container'],
        tagName: 'section',

        // Mobile parent view callbacks
        showMenu: function () {
            $('.js-content-list, .js-content-preview').addClass('show-menu').removeClass('show-content');
        },
        showContent: function () {
            $('.js-content-list, .js-content-preview').addClass('show-content').removeClass('show-menu');
        },
        showAll: function () {
            $('.js-content-list, .js-content-preview').removeClass('show-menu show-content');
        }
    });

    __exports__["default"] = PostsView;
  });
define("ghost/views/posts/index", 
  ["ghost/views/mobile/index-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileIndexView = __dependency1__["default"];

    var PostsIndexView = MobileIndexView.extend({
        classNames: ['no-posts-box']
    });

    __exports__["default"] = PostsIndexView;
  });
define("ghost/views/posts/post", 
  ["ghost/views/mobile/content-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileContentView = __dependency1__["default"];

    var PostsPostView = MobileContentView.extend();

    __exports__["default"] = PostsPostView;
  });
define("ghost/views/settings", 
  ["ghost/views/mobile/parent-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileParentView = __dependency1__["default"];

    var SettingsView = MobileParentView.extend({
        // MobileParentView callbacks
        showMenu: function () {
            $('.js-settings-header-inner').css('display', 'none');
            $('.js-settings-menu').css({right: '0', left: '0', 'margin-right': '0'});
            $('.js-settings-content').css({right: '-100%', left: '100%', 'margin-left': '15'});
        },
        showContent: function () {
            $('.js-settings-menu').css({right: '100%', left: '-110%', 'margin-right': '15px'});
            $('.js-settings-content').css({right: '0', left: '0', 'margin-left': '0'});
            $('.js-settings-header-inner').css('display', 'block');
        },
        showAll: function () {
            $('.js-settings-menu, .js-settings-content').removeAttr('style');
        }
    });

    __exports__["default"] = SettingsView;
  });
define("ghost/views/settings/about", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsAboutView = BaseView.extend();

    __exports__["default"] = SettingsAboutView;
  });
define("ghost/views/settings/apps", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsAppsView = BaseView.extend();

    __exports__["default"] = SettingsAppsView;
  });
define("ghost/views/settings/code-injection", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsGeneralView = BaseView.extend();

    __exports__["default"] = SettingsGeneralView;
  });
define("ghost/views/settings/content-base", 
  ["ghost/views/mobile/content-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileContentView = __dependency1__["default"];
    /**
     * All settings views other than the index should inherit from this base class.
     * It ensures that the correct screen is showing when a mobile user navigates
     * to a `settings.someRouteThatIsntIndex` route.
     */

    var SettingsContentBaseView = MobileContentView.extend({
        tagName: 'section',
        classNames: ['settings-content', 'js-settings-content', 'fade-in']
    });

    __exports__["default"] = SettingsContentBaseView;
  });
define("ghost/views/settings/general", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsGeneralView = BaseView.extend();

    __exports__["default"] = SettingsGeneralView;
  });
define("ghost/views/settings/index", 
  ["ghost/views/mobile/index-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileIndexView = __dependency1__["default"];

    var SettingsIndexView = MobileIndexView.extend();

    __exports__["default"] = SettingsIndexView;
  });
define("ghost/views/settings/labs", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsLabsView = BaseView.extend();

    __exports__["default"] = SettingsLabsView;
  });
define("ghost/views/settings/tags", 
  ["ghost/views/settings/content-base","ghost/mixins/pagination-view-infinite-scroll","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];
    var PaginationScrollMixin = __dependency2__["default"];

    var SettingsTagsView = BaseView.extend(PaginationScrollMixin);

    __exports__["default"] = SettingsTagsView;
  });
define("ghost/views/settings/tags/settings-menu", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var TagsSettingsMenuView = Ember.View.extend({
        saveText: Ember.computed('controller.model.isNew', function () {
            return this.get('controller.model.isNew') ?
                'Add Tag' :
                'Save Tag';
        }),

        // This observer loads and resets the uploader whenever the active tag changes,
        // ensuring that we can reuse the whole settings menu.
        updateUploader: Ember.observer('controller.activeTag.image', 'controller.uploaderReference', function () {
            var uploader = this.get('controller.uploaderReference'),
                image = this.get('controller.activeTag.image');

            if (uploader && uploader[0]) {
                if (image) {
                    uploader[0].uploaderUi.initWithImage();
                } else {
                    uploader[0].uploaderUi.initWithDropzone();
                }
            }
        })
    });

    __exports__["default"] = TagsSettingsMenuView;
  });
define("ghost/views/settings/users", 
  ["ghost/views/settings/content-base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];

    var SettingsUsersView = BaseView.extend();

    __exports__["default"] = SettingsUsersView;
  });
define("ghost/views/settings/users/user", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var SettingsUserView = Ember.View.extend({
        currentUser: Ember.computed.alias('controller.session.user'),

        isNotOwnProfile: Ember.computed('controller.user.id', 'currentUser.id', function () {
            return this.get('controller.user.id') !== this.get('currentUser.id');
        }),

        isNotOwnersProfile: Ember.computed.not('controller.user.isOwner'),

        canAssignRoles: Ember.computed.or('currentUser.isAdmin', 'currentUser.isOwner'),

        canMakeOwner: Ember.computed.and('currentUser.isOwner', 'isNotOwnProfile', 'controller.user.isAdmin'),

        rolesDropdownIsVisible: Ember.computed.and('isNotOwnProfile', 'canAssignRoles', 'isNotOwnersProfile'),

        deleteUserActionIsVisible: Ember.computed('currentUser', 'canAssignRoles', 'controller.user', function () {
            if ((this.get('canAssignRoles') && this.get('isNotOwnProfile') && !this.get('controller.user.isOwner')) ||
                (this.get('currentUser.isEditor') && (this.get('isNotOwnProfile') ||
                this.get('controller.user.isAuthor')))) {
                return true;
            }
        }),

        userActionsAreVisible: Ember.computed.or('deleteUserActionIsVisible', 'canMakeOwner')

    });

    __exports__["default"] = SettingsUserView;
  });
define("ghost/views/settings/users/users-list-view", 
  ["ghost/mixins/pagination-view-infinite-scroll","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var PaginationViewMixin = __dependency1__["default"];

    var UsersListView = Ember.View.extend(PaginationViewMixin, {
        classNames: ['js-users-list-view']
    });

    __exports__["default"] = UsersListView;
  });
// Loader to create the Ember.js application
/*global require */

if (!window.disableBoot) {
    window.App = require('ghost/app')['default'].create();
}

//# sourceMappingURL=ghost-dev.js.map