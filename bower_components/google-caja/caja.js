// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview ... TODO ihab.awad
 * @author kpreid@switchb.org
 * @author ihab.awad@gmail.com
 * @author jasvir@gmail.com
 * \@requires document, setTimeout, XMLHttpRequest
 * \@overrides window
 * \@provides caja
 */

var caja = (function () {
  var cajaBuildVersion = '5669';
  var defaultServer = 'https://caja.appspot.com/';
  var defaultFrameGroup;
  var readyQueue = [];
  var registeredImports = [];
  var nextId = 0;

  var UNREADY = 'UNREADY', PENDING = 'PENDING', READY = 'READY';
  var state = UNREADY;
  var globalConfig = undefined;

  var GUESS = 'GUESS';

  var ajaxCounter = 1;
  var unsafe = false;

  var loaderDocument;
  function proxyFetchMaker(proxyServer) {
    return function (url, mime, callback) {
      if (!url) {
        callback(undefined);
        return;
      }
      var rndName = 'caja_ajax_' + ajaxCounter++;
      window[rndName] = function (result) {
        try {
          callback(result);
        } finally {
          // GC yourself
          window[rndName] = undefined;
        }
      };
      // TODO(jasvir): Make it so this does not pollute the host page
      // namespace but rather just the loaderFrame
      installSyncScript(rndName,
        (proxyServer ? String(proxyServer) : caja['server'])
        + '/proxy?url=' + encodeURIComponent(url.toString())
        + '&input-mime-type=' + encodeURIComponent(mime)
        + '&callback=' + encodeURIComponent(rndName)
        + '&alt=json-in-script');
    };
  }

  function xhrFetcher(url, mime, callback) {
    var request = new XMLHttpRequest();
    request.open('GET', url.toString(), true);
    request.overrideMimeType(mime);
    request.onreadystatechange = function() {
      if(request.readyState == 4) {
        callback({ "html": request.responseText });
      }
    };
    request.send();
  }

  var uriPolicies = {
    'net': {
      'rewriter': {
        'NO_NETWORK': function () { return null; },
        'ALL': function (uri) { return String(uri); }
      },
      'fetcher': {
        'USE_XHR': xhrFetcher,
        'USE_AS_PROXY': proxyFetchMaker
      },
      'NO_NETWORK': {
        'rewrite': function () { return null; },
        'fetch': function(url, mime, callback) {
          setTimeout(function() {
            // TODO(kpreid): correct error response (define one if needed)
            callback({});
          }, 0);
        }
      },
      'ALL': {
        'rewrite': function (uri) { return String(uri); },
        'fetch': proxyFetchMaker(undefined)
      },
      'only': policyOnly
    },

    'ATTRIBUTETYPES': undefined,
    'LOADERTYPES': undefined,
    'URIEFFECTS': undefined
  };

  var caja = {
    // Normal entry points
    'initialize': initialize,
    'load': load,
    'whenReady': whenReady,

    // URI policies
    'policy': uriPolicies,

    // Reference to the taming frame in the default frameGroup
    'iframe': null,

    // Reference to the USELESS object for function invocation (for testing)
    'USELESS': undefined,

    // Taming functions for the default frameGroup
    'tame': premature,
    'tamesTo': premature,
    'reTamesTo': premature,
    'untame': premature,
    'unwrapDom': premature,
    'markReadOnlyRecord': premature,
    'markFunction': premature,
    'markCtor': premature,
    'markXo4a': premature,
    'grantMethod': premature,
    'grantRead': premature,
    'grantReadWrite': premature,
    'adviseFunctionBefore': premature,
    'adviseFunctionAfter': premature,
    'adviseFunctionAround': premature,
    'makeDefensibleObject___': premature,
    'makeDefensibleFunction___': premature,

    // Esoteric functions
    'initFeralFrame': initFeralFrame,
    'makeFrameGroup': makeFrameGroup,
    'configure': makeFrameGroup,
    'disableSecurityForDebugger': disableSecurityForDebugger,
    'Q': premature,

    // Used by related tools; not for users to call on a routine basis
    // Initialized to helper functions because they may be called by external
    // clients before caja.initialize() is called.
    'console': {
      'error': makeLogMethod('error'),
      'info': makeLogMethod('info'),
      'log': makeLogMethod('log'),
      'warn': makeLogMethod('warn')
    },

    // unused, removed by Closure
    closureCanary: 1
  };

  // Internal functions made available to FrameGroup maker
  var cajaInt = {
    'documentBaseUrl': documentBaseUrl,
    'getId': getId,
    'getImports': getImports,
    'joinUrl': joinUrl,
    'loadCajaFrame': loadCajaFrame,
    'prepareContainerDiv': prepareContainerDiv,
    'unregister': unregister,
    'readPropertyAsHostFrame': readPropertyAsHostFrame
  };

  //----------------

  function makeLogMethod(m) {
    return function() {
      globalConfig &&
        globalConfig.console[m].apply(globalConfig.console, arguments);
    };
  }

  function premature() {
    throw new Error('Calling taming function before Caja is ready');
  }

  function disableSecurityForDebugger(value) {
    unsafe = !!value;
    if (defaultFrameGroup) {
      defaultFrameGroup['disableSecurityForDebugger'](value);
    }
  }

  /**
   * Returns a URI policy that allows one URI and denies the rest.
   */
  function policyOnly(allowedUri) {
    allowedUri = String(allowedUri);
    return {
      'rewrite': function (uri) {
        uri = String(uri);
        return uri === allowedUri ? uri : null;
      }
    };
  }

  /**
   * Creates the default frameGroup with the given config.
   * See {@code makeFrameGroup} for config parameters.
   */
  function initialize(config /*, opt_onSuccess, opt_onFailure */) {
    if (state !== UNREADY) {
      throw new Error('Caja cannot be initialized more than once');
    }
    var onSuccess = arguments[1];
    var onFailure = arguments[2];
    state = PENDING;
    makeFrameGroup(config, function (frameGroup) {
      defaultFrameGroup = frameGroup;
      caja['iframe'] = frameGroup['iframe'];
      caja['USELESS'] = frameGroup['USELESS'];
      for (var i in caja) {
        if (caja[i] === premature) {
          caja[i] = frameGroup[i];
        }
      }
      frameGroup['disableSecurityForDebugger'](unsafe);
      state = READY;
      var detail = {};
      detail['es5Mode'] = true;  // legacy API -- non-ES5 mode is dead
      if ("function" === typeof onSuccess) {
        onSuccess(detail);
      }
      whenReady(null);
    }, function(err) {
      state = UNREADY;
      onFailure(err);
    });
  }

  /**
   * Creates a guest frame in the default frameGroup.
   */
  function load(div, uriPolicy, loadDone, domOpts) {
    uriPolicy = uriPolicy || caja['policy']['net']['NO_NETWORK'];
    if (state === UNREADY) {
      initialize({});
    }
    whenReady(function () {
      defaultFrameGroup['makeES5Frame'](div, uriPolicy, loadDone, domOpts);
    });
  }

  /**
   * Defers func until the default frameGroup is ready.
   */
  function whenReady(opt_func) {
    if (typeof opt_func === 'function') {
      readyQueue.push(opt_func);
    }
    if (state === READY) {
      for (var i = 0; i < readyQueue.length; i++) {
        setTimeout(readyQueue[i], 0);
      }
      readyQueue = [];
    }
  }

  /**
   * Create a Caja frame group. A frame group maintains a relationship with a
   * Caja server and some configuration parameters. Most Web pages will only
   * need to create one frame group.
   *
   * Recognized configuration parameters are:
   *
   *     server - the URL to a Caja server. Except for unique cases,
   *         this must be the server from which the "caja.js" script was
   *         sourced.
   *
   *     resources - the URL to a directory containing the resource files.
   *         If not specified, it defaults to the value of 'server'.
   *
   *     debug - whether debugging is supported. At the moment, debug support
   *         means that the files loaded by Caja are un-minified to help with
   *         tracking down problems.
   *
   *     es5Mode - Legacy option; must be true if specified.
   *
   *     maxAcceptableSeverity - Severity of browser bugs greater than
   *         this level cause failure.
   *
   *     forceES5Mode - Legacy option; must be true if specified.
   *
   *     console - Optional user-supplied alternative to the browser's native
   *         'console' object.
   *
   *     targetAttributePresets - Optional structure giving default and
   *         whitelist for the 'target' parameter of anchors and forms.
   *
   *     log - Optional user-supplied alternative to the browser's native
   *         'console.log' function.
   *
   *     flashbridge - Optional, location of flashbridge.swf.  This needs
   *         to be on the same domain as the host page.
   *
   * @param config an object literal containing configuration parameters.
   * @param frameGroupReady function to be called back with a reference to
   *     the newly created frame group.
   */
  function makeFrameGroup(config, frameGroupReady, onFailure) {
    initFeralFrame(window);
    globalConfig = config = resolveConfig(config);
    caja['server'] = config['server'];
    trySES(config, frameGroupReady, onFailure);
  }

  /**
   * Returns a full config based on the given partial config.
   */
  function resolveConfig(partial) {
    partial = partial || {};
    var full = {};
    full['server'] = String(
      partial['server'] || partial['cajaServer'] || defaultServer);
    full['resources'] = String(partial['resources'] || full['server']);
    full['debug'] = !!partial['debug'];
    // es5Mode and forceES5Mode are legacy
    if ('forceES5Mode' in partial && partial['forceES5Mode'] !== true
        && partial['forceES5Mode'] !== undefined) {
      throw new Error('forceES5Mode: false is no longer supported');
    }
    if ('es5Mode' in partial && partial['es5Mode'] !== true
        && partial['es5Mode'] !== undefined) {
      throw new Error('es5Mode: false is no longer supported');
    }
    var severity = String(partial['maxAcceptableSeverity'] ||
        'SAFE_SPEC_VIOLATION');
    if (severity === 'NO_KNOWN_EXPLOIT_SPEC_VIOLATION') {
      // Special severity level which SES itself no longer implements
      // TODO(kpreid): Should acceptNoKnownExploitProblems be part of our
      // public interface?
      severity = 'SAFE_SPEC_VIOLATION';
      full['acceptNoKnownExploitProblems'] = true;
    }
    full['maxAcceptableSeverity'] = severity;

    if (partial['console']) {
      // Client supplies full 'console' object, which we use
      full['console'] = partial['console'];
    } else if (partial['log']) {
      // Deprecated API: Client supplies 'log' function, from which we
      // build a 'console' object of sorts
      full['console'] = {
        'log': partial['log'],
        'warn': partial['log'],
        'error': partial['log'],
        'info': partial['log']
      };
    } else if (window['console']
        && typeof(window['console']['log']) === 'function') {
      // Platform supplies console object, which we use
      full['console'] = window['console'];
    } else {
      // Cannot find any logging functions; create no-op stubs
      full['console'] = {
        'log': function() {},
        'warn': function() {},
        'error': function() {},
        'info': function() {}
      };
    }

    if (partial['targetAttributePresets']) {
      if (!partial['targetAttributePresets']['default']) {
        throw 'targetAttributePresets must contain a default';
      }
      if (!partial['targetAttributePresets']['whitelist']) {
        throw 'targetAttributePresets must contain a whitelist';
      }
      if (partial['targetAttributePresets']['whitelist']['length'] === 0) {
        throw 'targetAttributePresets.whitelist array must be nonempty';
      }
      full['targetAttributePresets'] = partial['targetAttributePresets'];
    }
    if (typeof(partial['cajolingServiceClient']) === 'object'){
      full['cajolingServiceClient'] = partial['cajolingServiceClient'];
    }
    return full;
  }

  function initFeralFrame(feralWin) {
    if (feralWin['Object']['FERAL_FRAME_OBJECT___'] === feralWin['Object']) {
      return;
    }
    feralWin['___'] = {};
    feralWin['Object']['FERAL_FRAME_OBJECT___'] = feralWin['Object'];
  }

  //----------------

  function trySES(config, frameGroupReady, onFailure) {
    function frameInit(frameWin) {
      var ses = frameWin['ses'] || (frameWin['ses'] = {});
      ses['maxAcceptableSeverityName'] = config['maxAcceptableSeverity'];
      if (config['acceptNoKnownExploitProblems']) {
        ses['acceptableProblems'] = {
          'DEFINING_READ_ONLY_PROTO_FAILS_SILENTLY': { 'permit': true },

          // we don't use partly-unmodifiable arrays, and the repair for push
          // is too slow to use unless necessary (i.e. PUSH_IGNORES_FROZEN)
          'PUSH_IGNORES_SEALED': { 'permit': true, 'doNotRepair': true },
          'UNSHIFT_IGNORES_SEALED': { 'permit': true },
          'SPLICE_IGNORES_SEALED': { 'permit': true },
          'SHIFT_IGNORES_SEALED': { 'permit': true },
          'PUSH_DOES_NOT_THROW_ON_FROZEN_ARRAY':
              { 'permit': true, 'doNotRepair': true },
          'ARRAYS_DELETE_NONCONFIGURABLE': { 'permit': true },
          'ARRAYS_MODIFY_READONLY': { 'permit': true },

          // safe given that we use exactly one SES frame
          'FREEZE_IS_FRAME_DEPENDENT': { 'permit': true },
          'SYNTAX_ERRORS_ARENT_ALWAYS_EARLY': { 'permit': true },

          // Only affects code with strict nested function defs, which
          // violates the ES5.1 recommendation stated at
          // http://wiki.ecmascript.org/doku.php?id=conventions:recommendations_for_implementors.
          // Thus, the NESTED_STRICT_FUNCTIONS_LEAK
          // doesn't affect SES as long as SES remains
          // compatible with ES5 implementations that follow that
          // recommendation.
          'NESTED_STRICT_FUNCTIONS_LEAK': { 'permit': true }
        };
      }
      ses['mitigateSrcGotchas'] = function() {
        throw new EvalError('This function is a placeholder that should ' +
                            'have been replaced by the real ' +
                            'ses.mitigateSrcGotchas.');
      };
    }

    var sesMaker = makeFrameMaker(config, 'ses-single-frame', frameInit);

    loadCajaFrame(config, 'utility-frame', function (mitigateWin) {
      var mitigateSrcGotchas = mitigateWin['ses']['mitigateSrcGotchas'];
      sesMaker['make'](function (tamingWin) {
        if (tamingWin['ses']['ok']()) {
          var fg = tamingWin['SESFrameGroup'](
              cajaInt, config, tamingWin, window,
              { 'mitigateSrcGotchas': mitigateSrcGotchas });
          frameGroupReady(fg);
        } else {
          var err = new Error('Caja: Browser is unsupported');
          if ("function" === typeof onFailure) {
            onFailure(err);
          } else {
            throw err;
          }
        }
      });
    });
  }

  //----------------

  /**
   * Returns an object that wraps loadCajaFrame() with preload support.
   * Calling frameMaker.preload() will start creation of a new frame now,
   * and make it available to a later call to frameMaker.make().
   */
  // TODO(kpreid): With the death of ES5/3 we no longer ever create multiple
  // frames of a kind. However, this is still used to effectively load
  // ses-frame and utility-frame in parallel. Simplify.
  function makeFrameMaker(config, filename, opt_frameCreated) {
    var IDLE = 'IDLE', LOADING = 'LOADING', WAITING = 'WAITING';
    var preState = IDLE, preWin, preReady;
    var self = {
      'preload': function () {
        if (preState === IDLE) {
          preState = LOADING;
          preWin = null;
          loadCajaFrame(config, filename, function (win) {
            preWin = win;
            consumeIfReady();
          }, opt_frameCreated);
        }
      },
      'make': function (onReady) {
        if (preState === LOADING) {
          preState = WAITING;
          preReady = onReady;
          consumeIfReady();
        } else {
          loadCajaFrame(config, filename, onReady, opt_frameCreated);
        }
      }
    };
    self['preload']();
    return self;

    function consumeIfReady() {
      if (preState === WAITING && preWin) {
        var win = preWin, ready = preReady;
        preState = IDLE;
        preWin = null;
        preReady = null;
        ready(win);
      }
    }
  }

  //----------------

  function loadCajaFrame(config, filename, frameReady, opt_frameCreated) {
    var frameWin = createFrame(filename);
    // debuggable or minified.  ?debug=1 inhibits compilation in shindig
    var suffix = config['debug'] ? '.js?debug=1' : '.opt.js?debug=1';
    var url = joinUrl(
      config['resources'],
      cajaBuildVersion + '/' + filename + suffix);
    // The particular interleaving of async events shown below has been found
    // necessary to get the right behavior on Firefox 3.6. Otherwise, the
    // iframe silently fails to invoke the cajaIframeDone___ callback.
    setTimeout(function () {
      frameWin['cajaIframeDone___'] = function () {
        versionCheck(config, frameWin, filename);
        frameReady(frameWin);
      };
      if (opt_frameCreated) { opt_frameCreated(frameWin); }
      // TODO(jasvir): Test what the latency doing this on all browsers is
      // and why its necessary
      setTimeout(function () {
        installAsyncScript(frameWin, url);
      }, 0);
    }, 0);
  }

  // Throws an error if frameWin has the wrong Caja version
  function versionCheck(config, frameWin, filename) {
    if (cajaBuildVersion !== frameWin['cajaBuildVersion']) {
      var message = 'Version error: caja.js version ' + cajaBuildVersion +
        ' does not match ' + filename + ' version ' +
        frameWin['cajaBuildVersion'] + '.';

      var majorCajaVersion = String(cajaBuildVersion).split(/[mM]/)[0];
      var majorWinVersion =
        String(frameWin['cajaBuildVersion']).split(/[mM]/)[0];
      if (majorCajaVersion === majorWinVersion) {
        message += '  Continuing because major versions match.';
        config['console']['log'](message);
      } else {
        config['console']['log'](message);
        throw new Error(message);
      }
    }
  }

  /**
   * opt_container may be absent, an element, or a Document. If absent
   * then no DOM or related APIs are given to the guest.
   */
  function prepareContainerDiv(opt_container, feralWin, domOpts) {
    domOpts = domOpts || {};
    var opt_idClass = domOpts ? domOpts['idClass'] : void 0;
    var idClass = opt_idClass || ('caja-guest-' + nextId++ + '___');
    if (opt_container && opt_container.nodeType === 9 /* Document */) {
      caja['console']['warn']('Warning: Using a document, rather than an ' +
          'element, as a Caja virtual document container is an experimental ' +
          'feature and may not operate correctly or support all features.');
      initFeralFrame(opt_container.defaultView);
    }
    return {
      'idClass': idClass,
      'opt_div': opt_container
    };
  }

  // Creates a new iframe and returns its contentWindow.
  function createFrame(opt_className) {
    var frame = document.createElement('iframe');
    frame.style.display = "none";
    frame.width = 0;
    frame.height = 0;
    frame.className = opt_className || '';
    var where = document.getElementsByTagName('script')[0];
    where.parentNode.insertBefore(frame, where);
    return frame.contentWindow;
  }

  function installAsyncScript(frameWin, scriptUrl) {
    var frameDoc = frameWin['document'];
    var script = frameDoc.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.src = scriptUrl;
    frameDoc.body.appendChild(script);
  }

  // TODO(jasvir): This should pulled into a utility js file
  function escapeAttr(s) {
    var ampRe = /&/g;
    var ltRe = /[<]/g;
    var gtRe = />/g;
    var quotRe = /\"/g;
    return ('' + s).replace(ampRe, '&amp;')
      .replace(ltRe, '&lt;')
      .replace(gtRe, '&gt;')
      .replace(quotRe, '&#34;');
  }

  function installSyncScript(name, url) {
     if (!loaderDocument) {
       loaderDocument = createFrame('loader-frame').document;
     }
     // TODO(jasvir): This assignment pins the parent's handler
     // function and, iiuc, this reference is never cleared out.
     var result = ''
       + ('<script>var $name = parent.window["$name"];<\/script>'
           .replace(/[$]name/g, name))
       + ('<script type="text/javascript" src="$url"><\/script>'
           .replace(/[$]url/g, escapeAttr(url)));
     loaderDocument.write(result);
   }

  function joinUrl(base, path) {
    base = base.replace(/\/+$/, '');
    path = path.replace(/^\/+/, '');
    return base + '/' + path;
  }

  function documentBaseUrl() {
    // TODO(kpreid): Why aren't we using document.baseURI?
    var bases = document.getElementsByTagName('base');
    if (bases.length == 0) {
      return document.location.toString();
    } else if (bases.length == 1) {
      var href = bases[0].href;
      if (typeof href !== 'string') {
        throw new Error('Caja loader error: <base> without a href.');
      }
      return href;
    } else {
      throw new Error('Caja loader error: document contains multiple <base>.');
    }
  }

  //----------------

  /**
   * Enforces {@code typeof specimen === typename}, in which case
   * specimen is returned.
   * <p>
   * If not, throws an informative TypeError
   * <p>
   * opt_name, if provided, should be a name or description of the
   * specimen used only to generate friendlier error messages.
   */
  function enforceType(specimen, typename, opt_name) {
    if (typeof specimen !== typename) {
      throw new TypeError('expected ' + typename + ' instead of ' +
          typeof specimen + ': ' + (opt_name || specimen));
    }
    return specimen;
  }

  /**
   * Read the given property of the given object. Exists only to work
   * around browser bugs where the answer depends on who's asking the
   * question.
   */
  function readPropertyAsHostFrame(object, property) {
    return object[property];
  }

  /**
   * Gets or assigns the id associated with this (assumed to be)
   * imports object, registering it so that
   * <tt>getImports(getId(imports)) === imports</tt>.
   * <p>
   * This system of registration and identification allows us to
   * cajole html such as
   * <pre>&lt;a onmouseover="alert(1)"&gt;Mouse here&lt;/a&gt;</pre>
   * into html-writing JavaScript such as<pre>
   * IMPORTS___.document.innerHTML = "
   *  &lt;a onmouseover=\"
   *    (function(IMPORTS___) {
   *      IMPORTS___.alert(1);
   *    })(___.getImports(" + ___.getId(IMPORTS___) + "))
   *  \"&gt;Mouse here&lt;/a&gt;
   * ";
   * </pre>
   * If this is executed by a plugin whose imports is assigned id 42,
   * it generates html with the same meaning as<pre>
   * &lt;a onmouseover="___.getImports(42).alert(1)"&gt;Mouse here&lt;/a&gt;
   * </pre>
   * <p>
   * An imports is not registered and no id is assigned to it until the
   * first call to <tt>getId</tt>. This way, an imports that is never
   * registered, or that has been <tt>unregister</tt>ed since the last
   * time it was registered, will still be garbage collectable.
   */
  // TODO(kpreid): I think this is dead after ES5/3
  function getId(imports) {
    enforceType(imports, 'object', 'imports');
    var id;
    if ('id___' in imports) {
      id = enforceType(imports['id___'], 'number', 'id');
    } else {
      id = imports['id___'] = registeredImports.length;
    }
    registeredImports[id] = imports;
    return id;
  }

  /**
   * Gets the imports object registered under this id.
   * <p>
   * If it has been <tt>unregistered</tt> since the last
   * <tt>getId</tt> on it, then <tt>getImports</tt> will fail.
   */
  // TODO(kpreid): I think this is dead after ES5/3
  function getImports(id) {
    var result = registeredImports[enforceType(id, 'number', 'id')];
    if (result === void 0) {
      throw new Error('Internal: imports#', id, ' unregistered');
    }
    return result;
  }

  /**
   * If you know that this <tt>imports</tt> no longer needs to be
   * accessed by <tt>getImports</tt>, then you should
   * <tt>unregister</tt> it so it can be garbage collected.
   * <p>
   * After unregister()ing, the id is not reassigned, and the imports
   * remembers its id. If asked for another <tt>getId</tt>, it
   * reregisters itself at its old id.
   */
  // TODO(kpreid): I think this is dead after ES5/3
  function unregister(imports) {
    enforceType(imports, 'object', 'imports');
    if ('id___' in imports) {
      var id = enforceType(imports['id___'], 'number', 'id');
      registeredImports[id] = void 0;
    }
  }

  return caja;
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['caja'] = caja;
}
