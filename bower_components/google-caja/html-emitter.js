// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * JavaScript support for TemplateCompiler.java and for a tamed version of
 * <code>document.write{,ln}</code>.
 * <p>
 * This handles the problem of making sure that only the bits of a Gadget's
 * static HTML which should be visible to a script are visible, and provides
 * mechanisms to reliably find elements using dynamically generated unique IDs
 * in the face of DOM modifications by untrusted scripts.
 *
 * @author mikesamuel@gmail.com
 * @author jasvir@gmail.com
 * @provides HtmlEmitter
 * @overrides window
 * @requires bridalMaker html htmlSchema cajaVM URI Q
 * @requires lexCss sanitizeMediaQuery sanitizeStylesheetWithExternals
 * @overrides window
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * @param base a node that is the ancestor of all statically generated HTML.
 * @param opt_mitigatingUrlRewriter a script url rewriting proxy which can be used
 *     to optionally load premitigated scripts instead of mitigating on the
 *     fly (used only in SES)
 * @param opt_domicile the domado instance that will receive a load event when
 *     the html-emitter is closed, and which will have the {@code writeHook}
 *     property set to the HtmlEmitter's document.write implementation.
 * @param opt_guestGlobal the object in the guest frame that is the global scope
 *     for guest code.
 */
function HtmlEmitter(base, opt_mitigatingUrlRewriter, opt_domicile,
      opt_guestGlobal) {
  if (!base) {
    throw new Error(
        'Host page error: Virtual document element was not provided');
  }

  var targetDocument = base.nodeType === 9  // Document node
      ? base
      : base.ownerDocument;

  // TODO(kpreid): Fix our terminology: HTML5 spec contains something called the
  // 'insertion point', which is not this; this is the 'current node' and
  // implicitly the 'stack of open elements' via parents.
  var insertionPoint = base;
  var bridal = bridalMaker(targetDocument);

  // TODO: Take into account <base> elements.

  /**
   * Contiguous pairs of ex-descendants of base, and their ex-parent.
   * The detached elements (even indices) are ordered depth-first.
   */
  var detached = null;
  /** Makes sure IDs are accessible within removed detached nodes. */
  var idMap = null;

  /** Hook from attach/detach to document.write logic. */
  var updateInsertionMode, notifyEOF;

  var arraySplice = Array.prototype.splice;

  var HTML5_WHITESPACE_RE = /^[\u0009\u000a\u000c\u000d\u0020]*$/;

  function buildIdMap() {
    idMap = {};
    var descs = base.getElementsByTagName('*');
    for (var i = 0, desc; (desc = descs[i]); ++i) {
      var id = desc.getAttributeNode('id');
      // The key is decorated to avoid name conflicts and restrictions.
      if (id && id.value) { idMap[id.value + " map entry"] = desc; }
    }
  }
  /**
   * Returns the element with the given ID under the base node.
   * @param id an auto-generated ID since we cannot rely on user supplied IDs
   *     to be unique.
   * @return {Element|null} null if no such element exists.
   */
  function byId(id) {
    if (!idMap) { buildIdMap(); }
    var node = idMap[id + " map entry"];
    if (node) { return node; }
    for (; (node = targetDocument.getElementById(id));) {
      if (base.contains
          ? base.contains(node)
          : (base.compareDocumentPosition(node) & 0x10)) {
        idMap[id + " map entry"] = node;
        return node;
      } else {
        node.id = '';
      }
    }
    return null;
  }

  /**
   * emitStatic allows the caller to inject the static HTML from JavaScript,
   * if the gadget host page's usage pattern requires it.
   */
  function emitStatic(htmlString) {
    if (!insertionPoint) {
      throw new Error('Host page error: HtmlEmitter.emitStatic called after' +
          ' document finish()ed');
    }
    if (base.nodeType === 1 /* Element */) {
      base.innerHTML += htmlString;
    } else {
      // We need to handle Document nodes, which don't provide .innerHTML.

      // Additionally, we currently don't use real <html> and <head> elements
      // and so just doing base.write(htmlString), which would otherwise be
      // sufficient, would insert unwanted structure around our HTML.
      // TODO(kpreid): Fix that.
      var dummy = targetDocument.createElement('div');
      dummy.innerHTML = htmlString;
      while (dummy.firstChild) {
        base.appendChild(dummy.firstChild);
      }
    }
    updateInsertionMode();
  }

  // Below we define the attach, detach, and finish operations.
  // These obey the conventions that:
  //   (1) All detached nodes, along with their ex-parents are in detached,
  //       and they are ordered depth-first.
  //   (2) When a node is specified by an ID, after the operation is performed,
  //       it is in the tree.
  //   (3) Each node is attached to the same parent regardless of what the
  //       script does.  Even if a node is removed from the DOM by a script,
  //       any of its children that appear after the script, will be added.
  // As an example, consider this HTML which has the end-tags removed since
  // they don't correspond to actual nodes.
  //   <table>
  //     <script>
  //     <tr>
  //       <td>Foo<script>Bar
  //       <th>Baz
  //   <script>
  //   <p>The-End
  // There are two script elements, and we need to make sure that each only
  // sees the bits of the DOM that it is supposed to be aware of.
  //
  // To make sure that things work when javascript is off, we emit the whole
  // HTML tree, and then detach everything that shouldn't be present.
  // We represent the removed bits as pairs of (removedNode, parentItWasPartOf).
  // Including both makes us robust against changes scripts make to the DOM.
  // In this case, the detach operation results in the tree
  //   <table>
  // and the detached list
  //   [<tr><td>FooBar<th>Baz in <table>, <p>The-End in (base)]

  // After the first script executes, we reattach the bits needed by the second
  // script, which gives us the DOM
  //   <table><tr><td>Foo
  // and the detached list
  //   ['Bar' in <td>, <th>Baz in <tr>, <p>The-End in (base)]
  // Note that we did not simply remove items from the old detached list.  Since
  // the second script was deeper than the first, we had to add only a portion
  // of the <tr>'s content which required doing a separate mini-detach operation
  // and push its operation on to the front of the detached list.

  // After the second script executes, we reattach the bits needed by the third
  // script, which gives us the DOM
  //   <table><tr><td>FooBar<th>Baz
  // and the detached list
  //   [<p>The-End in (base)]

  // After the third script executes, we reattached the rest of the detached
  // nodes, and we're done.

  // To perform a detach or reattach operation, we impose a depth-first ordering
  // on HTML start tags, and text nodes:
  //   [0: <table>, 1: <tr>, 2: <td>, 3: 'Foo', 4: 'Bar', 5: <th>, 6: 'Baz',
  //    7: <p>, 8: 'The-End']
  // Then the detach operation simply removes the minimal number of nodes from
  // the DOM to make sure that only a prefix of those nodes are present.
  // In the case above, we are detaching everything after item 0.
  // Then the reattach operation advances the number.  In the example above, we
  // advance the index from 0 to 3, and then from 3 to 6.
  // The finish operation simply reattaches the rest, advancing the counter from
  // 6 to the end.

  // The minimal detached list from the node with DFS index I is the ordered
  // list such that a (node, parent) pair (N, P) is on the list if
  // dfs-index(N) > I and there is no pair (P, GP) on the list.

  // To calculate the minimal detached list given a node representing a point in
  // that ordering, we rely on the following observations:
  //    The minimal detached list after a node, is the concatenation of
  //    (1) that node's children in order
  //    (2) the next sibling of that node and its later siblings,
  //        the next sibling of that node's parent and its later siblings,
  //        the next sibling of that node's grandparent and its later siblings,
  //        etc., until base is reached.

  function detachOnto(limit, out) {
    // Set detached to be the minimal set of nodes that have to be removed
    // to make sure that limit is the last attached node in DFS order as
    // specified above.

    // First, store all the children.
    for (var child = limit.firstChild, next; child; child = next) {
      next = child.nextSibling;  // removeChild kills nextSibling.
      out.push(child, limit);
      limit.removeChild(child);
    }

    // Second, store your ancestor's next siblings and recurse.
    for (var anc = limit, greatAnc; anc && anc !== base; anc = greatAnc) {
      greatAnc = anc.parentNode;
      for (var sibling = anc.nextSibling, next; sibling; sibling = next) {
        next = sibling.nextSibling;
        out.push(sibling, greatAnc);
        greatAnc.removeChild(sibling);
      }
    }
  }
  /**
   * Make sure that everything up to and including the node with the given ID
   * is attached, and that nothing that follows the node is attached.
   */
  function attach(id) {
    var limit = byId(id);
    if (detached) {
      // Build an array of arguments to splice so we can replace the reattached
      // nodes with the nodes detached from limit.
      var newDetached = [0, 0];
      // Since limit has no parent, detachOnto will bottom out at its sibling.
      detachOnto(limit, newDetached);
      // Find the node containing limit that appears on detached.
      var limitAnc = limit;
      for (var parent; (parent = limitAnc.parentNode);) {
        limitAnc = parent;
      }
      // Reattach up to and including limit ancestor.
      // If some browser quirk causes us to miss limit in detached, we'll
      // reattach everything and try to continue.
      var nConsumed = 0;
      while (nConsumed < detached.length) {
        // in IE, some types of nodes can't be standalone, and detaching
        // one will create new parentNodes for them.  so at this point,
        // limitAnc might be an ancestor of the node on detached.
        var reattach = detached[nConsumed];
        var reattAnc = reattach;
        for (; reattAnc.parentNode; reattAnc = reattAnc.parentNode) {}
        (detached[nConsumed + 1] /* the parent */).appendChild(reattach);
        nConsumed += 2;
        if (reattAnc === limitAnc) { break; }
      }
      // Replace the reattached bits with the ones detached from limit.
      newDetached[1] = nConsumed;  // splice's second arg is the number removed
      arraySplice.apply(detached, newDetached);
    } else {
      // The first time attach is called, the limit is actually part of the DOM.
      // There's no point removing anything when all scripts are deferred.
      detached = [];
      detachOnto(limit, detached);
    }
    // Keep track of the insertion point for document.write.
    // The tag was closed if there is no child waiting to be added.
    // FIXME(mikesamuel): This is not technically correct, since the script
    // element could have been the only child.
    var isLimitClosed = detached[1] !== limit;
    insertionPoint = isLimitClosed ? limit.parentNode : limit;
    updateInsertionMode();
    return limit;
  }
  /**
   * Removes a script place-holder.
   * When a text node immediately precedes a script block, the limit will be
   * a text node.  Text nodes can't be addressed by ID, so the TemplateCompiler
   * follows them with a {@code <span>} which must be removed to be semantics
   * preserving.
   */
  function discard(placeholder) {
    // An untrusted script block should not be able to access the wrapper before
    // it's removed since it won't be part of the DOM so there should be a
    // parentNode.
    placeholder.parentNode.removeChild(placeholder);
  }
  /**
   * Reattach any remaining detached bits, free resources. Corresponds to HTML5
   * document.close(). May be called redundantly.
   *
   * See also reopen() below.
   */
  function finish() {
    if (detached) {
      for (var i = 0, n = detached.length; i < n; i += 2) {
        detached[i + 1].appendChild(detached[i]);
      }
    }
    // Release references so nodes can be garbage collected.
    idMap = detached = null;
    // At this point we need to close the document, which means
    // adding html/head/body elements if they're missing.
    // notifyEOF() will do that, but we have to set
    // insertionPoint and insertionMode appropriately first.
    insertionPoint = hasChild(base, 'html') || base;
    updateInsertionMode();
    notifyEOF();
    insertionPoint = null;
    return this;
  }

  function virtTagName(el) {
    if (!el) { return ''; }
    return htmlSchema.realToVirtualElementName(el.tagName).toLowerCase();
  }

  function hasChild(el, name) {
    if (!el) { return false; }
    
    for (var child = el.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && virtTagName(child) === name) {
        return child;
      }
    }
    return false;
  }

  function signalLoaded() {
    // Signals the close of the document and fires any window.onload event
    // handlers.
    var domicile = opt_domicile;
    // Fire any deferred or async scripts and after they're all loaded,
    // fire any onload handlers.
    if (domicile) {
      delayScript(function () { domicile.signalLoaded(); });
    }
    execDelayedScripts();
    return this;
  }


  /**
   * Delayed scripts that should be evaluated before signalling that the
   * document is loaded.
   * Elements in this are one of<ul>
   * <li>null - script which has been executed.</li>
   * <li>UNSATISFIED - script which cannot yet be executed.</li>
   * <li>a function of zero arguments which encapsulates the script body.</li>
   * </ul>
   */
  var delayedScripts = [];

  var UNSATISFIED = {};

  function delayScript(fn) {
    if (delayedScripts) {
      delayedScripts.push(fn);
    } else {
      fn();
    }
  }

  // Execute any delayed scripts.
  function execDelayedScripts() {
    if (delayedScripts) {
      // Sample length each time in case one delayed scripts execution
      // causes another to fire.
      for (var i = 0; i < delayedScripts.length; ++i) {
        var delayedScript = delayedScripts[i];
        if (!delayedScript) { continue; }
        if (delayedScript === UNSATISFIED) { return; }
        delayedScripts[i] = null;
        try {
          delayedScript();
        } catch (_) {
          // Any dispatching to onerror should have been handled by
          // delayedScript so log.
          // TODO(mikesamuel): How do we log from this file.
          // Should domicile provide a log hook?
        }
      }
      delayedScripts = null;
    }
  }


  function handleEmbed(params) {
    if (!opt_guestGlobal) { return; }
    if (!opt_guestGlobal.cajaHandleEmbed) { return; }
    opt_guestGlobal.cajaHandleEmbed(params);
  }

  this.byId = byId;
  this.attach = attach;
  this.discard = discard;
  this.emitStatic = emitStatic;
  this.finish = finish;
  this.signalLoaded = signalLoaded;
  this.setAttr = bridal.setAttribute;
  this.rmAttr = function(el, attr) { return el.removeAttribute(attr); };
  this.handleEmbed = handleEmbed;

  (function (domicile) {
    if (!domicile || domicile.writeHook) {
      updateInsertionMode = notifyEOF = function () {};
      return;
    }

    function concat(items) {
      return Array.prototype.join.call(items, '');
    }

    function evaluateUntrustedScript(
        scriptBaseUri, scriptInnerText, scriptNode, opt_delayed, opt_mitigate) {
      if (!opt_guestGlobal) { return; }

      if (opt_delayed) {
        delayScript(function () {
          evaluateUntrustedScript(
            scriptBaseUri, scriptInnerText, scriptNode, false, opt_mitigate);
        });
        return;
      }

      var errorMessage = "SCRIPT element evaluation failed";

      var cajaVM = opt_guestGlobal.cajaVM;
      if (cajaVM) {
        var compileModule = cajaVM.compileModule;
        if (compileModule) {
          try {
            // TODO(jasvir): Consider caching in localStorage here
            // May require tying the key to the caja version and/or
            // a crypto hash
            var compiledModule = compileModule(scriptInnerText, opt_mitigate);
            try {
              compiledModule(opt_domicile.window);

              // Success.
              domicile.fireVirtualEvent(scriptNode, 'Event', 'load');
              return;  // Do not trigger onerror below.
            } catch (runningEx) {
              errorMessage = String(runningEx);
            }
          } catch (compileEx) {
            errorMessage =
              String(compileEx && (compileEx.message || compileEx.description))
                || errorMessage;
          }
        }
      }

      // TODO(kpreid): Include error message appropriately
      domicile.fireVirtualEvent(scriptNode, 'Event', 'error');

      // Dispatch to the onerror handler.
      try {
        // TODO(kpreid): This should probably become a full event dispatch.
        // TODO: Should this happen inline or be dispatched out of band?
        opt_domicile.window.onerror(
            errorMessage,
            // URL where error was raised.
            // If this is an external load, then we need to use that URL,
            // but for inline scripts we maintain the illusion by using the
            // domicile.pseudoLocation.href which was passed here.
            scriptBaseUri,
            1  // Line number where error was raised.
            // TODO: remap by inspection of the error if possible.
            );
      } catch (_) {
        // Ignore problems dispatching error.
      }

      return errorMessage;
    }

    function makeCssUriHandler(baseUri, method, mime) {
      return function(uri, prop) {
        // TODO: sanitizeCss* functions resolve URIs, so can we avoid closing
        // over baseUri here?
        return (domicile && domicile[method])
            ? domicile[method](URI.utils.resolve(baseUri, uri), mime, prop)
            : void 0;
      };
    }

    function makeCssUriSanitizer(baseUri) {
      return makeCssUriHandler(baseUri, 'cssUri', 'image/*');
    }

    function makeCssUriFetcher(baseUri) {
      return makeCssUriHandler(baseUri, 'fetchUri', 'text/css');
    }

    function defineUntrustedStylesheet(
        styleBaseUri, cssText, styleElement, outerMediaQuery) {
      var safeCss;
      function emitCss(text) {
        // If a stylesheet has a media attribute, and contains an import with
        // a media query:
        //   <style media="screen and (color)">
        //     @import "foo.css" only (fancy:very)
        //   </style>
        // We cannot just AND two media queries, though because media queries
        // do not arbitrarily parenthesize, so instead we use a master outer
        // @media block and allow continuation to nest @media inside it.
        if (outerMediaQuery) {
          text = '@media ' + outerMediaQuery + ' {\n' + text + '\n}';
        }
        styleElement.appendChild(styleElement.ownerDocument.createTextNode(
            text + '\n'));
      }
      function continuation(sanitizeStyle, moreToCome) {
        if (!moreToCome && safeCss) {
          emitCss(safeCss.toString());
        }
      }
      if (domicile && domicile.emitCss) {
        var sanitized = sanitizeStylesheetWithExternals(
            styleBaseUri, cssText, domicile.virtualization,
            makeCssUriSanitizer(styleBaseUri),
            makeCssUriFetcher(styleBaseUri),
            continuation);
        safeCss = sanitized.result;
        continuation(sanitized.result, sanitized.moreToCome);
      }
    }

    function resolveUntrustedExternal(
        url, mime, marker, continuation) {
      if (domicile && domicile.fetchUri) {
        domicile.fetchUri(url, mime,
          function (result) {
            if (result && result.html) {
              continuation(url, result.html);
            } else {
              continuation(url, null);
            }
          });
        if (marker) {
          throw marker;
        }
      }
    }

    function defineUntrustedExternalStylesheet(
        url, styleElement, marker, media, continuation) {
      resolveUntrustedExternal(
          url, 'text/css', marker, function(url, result) {
            if (result !== null) {
              defineUntrustedStylesheet(url, result, styleElement, media);
            }
            continuation();
          });
    }

    function getMitigatedUrl(url) {
      if (!opt_mitigatingUrlRewriter) { return null; }
      if ('function' === typeof opt_mitigatingUrlRewriter) {
        var p = opt_mitigatingUrlRewriter(URI.parse(url));
        return p ? String(p) : null;
      }
      return null;
    }

    function evaluateUntrustedExternalScript(
        url, scriptNode, marker, opt_continuation, delayed) {
      var proxiedUrl = getMitigatedUrl(url);
      var mitigateOpts;
      if (proxiedUrl) {
        // Disable mitigation
        mitigateOpts = {
          parseProgram : true,
          rewriteTopLevelVars : false,
          rewriteTopLevelFuncs : false,
          rewriteTypeOf : false
        };
        url = proxiedUrl;
      } else {
        mitigateOpts = undefined; // Enable all mitigation
      }
      var handler;
      if (delayed && delayedScripts) {
        var idx = delayedScripts.length;
        delayedScripts[idx] = UNSATISFIED;
        handler = function(url, src) {
          delayedScripts[idx] = function () {
            evaluateUntrustedScript(url, src, scriptNode, true, mitigateOpts);
          };
          // TODO(mikesamuel): should this be done via timeout?
          execDelayedScripts();
        };
      } else {
        handler = function(uri, src, opt_delayed) {
          evaluateUntrustedScript(uri, src, scriptNode, opt_delayed,
              mitigateOpts);
        };
      }
      function outerHandler(uri, src, opt_delayed) {
        // TODO(kpreid): opt_delayed never passed?
        handler(
            uri,
            src === null ? 'throw new Error("not loaded")' : src,
            opt_delayed);
        if (opt_continuation) { opt_continuation(); }
      }
      // TODO(mikesamuel): What is the appropriate voodoo here that triggers
      // dispatch to the module global onerror handler?
      // Can we prepackage a 'throw new Error("not loaded")' module, and load
      // that when loading otherwise fails?

      resolveUntrustedExternal(url, 'text/javascript', marker, outerHandler);
    }

    function finishCdata() {
      var result = {
        text: cdataContent.join(''),
        external: pendingExternal,
        delayed: pendingDelayed
      };
      cdataContent.length = 0;
      pendingExternal = undefined;
      pendingDelayed = false;
      return result;
    }

    function lookupAttr(attribs, attr) {
      var srcIndex = 0;
      do {
        srcIndex = attribs.indexOf(attr, srcIndex) + 1;
      } while (srcIndex && !(srcIndex & 1));
      return srcIndex ? attribs[srcIndex] : undefined;
    }

    function resolveUriRelativeToDocument(href) {
      if (domicile && domicile.pseudoLocation && domicile.pseudoLocation.href) {
        return URI.utils.resolve(domicile.pseudoLocation.href, href);
      }
      return href;
    }

    // Chunks of CDATA content which need to be specially processed and
    // interpreted rather than inserted into the host DOM.
    var cdataContent = [];
    // The URL of any pending CDATA element, for example the value of the
    // <script src> attribute.
    var pendingExternal = undefined;
    // True iff the pending CDATA tag is defer or async.
    var pendingDelayed = false;
    // The value of the media attribute of a pending CDATA <style> element.
    var pendingMedia = '';

    var documentLoaded = undefined;
    var depth = 0;

    /**
     * Note: mutates attribs to virtualized form.
     */
    function normalInsert(virtualTagName, attribs) {
      var realTagName = htmlSchema.virtualToRealElementName(virtualTagName);

      // Extract attributes which we need to invoke side-effects on rather
      // than just sanitization; currently <body> event handlers.
      var slowPathAttribs = [];
      if (opt_domicile && virtualTagName === 'body') {
        for (var i = attribs.length - 2; i >= 0; i -= 2) {
          if (/^on/i.test(attribs[i])) {
            slowPathAttribs.push.apply(slowPathAttribs, attribs.splice(i, 2));
          }
        }
      }

      var vSchemaEl = htmlSchema.element(virtualTagName);
      var rSchemaEl = htmlSchema.element(realTagName);

      domicile.sanitizeAttrs(realTagName, attribs);

      if (!rSchemaEl.allowed && realTagName !== 'script' &&
          realTagName !== 'style') {
        throw new Error('HtmlEmitter internal: unsafe element ' + realTagName +
            ' slipped through virtualization!');
      }

      var el = bridal.createElement(realTagName, attribs);
      if (vSchemaEl.optionalEndTag && el.tagName === insertionPoint.tagName) {
        documentWriter.endTag(el.tagName.toLowerCase(), true);
        // TODO(kpreid): Replace this with HTML5 parsing model
      }
      insertionPoint.appendChild(el);
      if (!vSchemaEl.empty) { insertionPoint = el; }

      for (var i = slowPathAttribs.length - 2; i >= 0; i -= 2) {
        opt_domicile.tameNode(el).setAttribute(
          slowPathAttribs[i], slowPathAttribs[i+1]);
      }
    }

    function normalEndTag(tagName) {
      tagName = htmlSchema.virtualToRealElementName(tagName).toUpperCase();

      var anc = insertionPoint;
      while (anc !== base && !/\bvdoc-container___\b/.test(anc.className)) {
        var p = anc.parentNode;
        if (anc.tagName === tagName) {
          insertionPoint = p;
          return;
        }
        anc = p;
      }
    }

    function normalText(text) {
      var realTagName = insertionPoint.tagName;
      if (!htmlSchema.element(realTagName).allowed) {
        throw new Error('HtmlEmitter internal: attempted to add text to ' +
            'unsafe element ' + realTagName + '!');
      }
      insertionPoint.appendChild(targetDocument.createTextNode(
          html.unescapeEntities(text)));
    }

    function stopParsing() {
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#stop-parsing
      // Note: Most of the post-processing tasks are currently handled by the
      // caller of finish(), not this code.
      insertionPoint = null;
    }

    // Per HTML5 spec
    function isHtml5NonWhitespace(text) {
      return !HTML5_WHITESPACE_RE.test(text);
    }
    var insertionModes = {
      initial: {
        toString: function () { return "initial"; },
        startTag: function (tagName, attribs) {
          insertionMode = insertionModes.beforeHtml;
          insertionMode.startTag.apply(undefined, arguments);
        },
        endTag: function (tagName) {
          insertionMode = insertionModes.beforeHtml;
          insertionMode.endTag.apply(undefined, arguments);
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode = insertionModes.beforeHtml;
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          insertionMode = insertionModes.beforeHtml;
          insertionMode.endOfFile();
        }
      },
      beforeHtml: {
        toString: function () { return "before html"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            normalInsert(tagName, attribs);
            insertionMode = insertionModes.beforeHead;
          } else {
            normalInsert('html', []);
            insertionMode = insertionModes.beforeHead;
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'head' || tagName === 'body' || tagName === 'html' ||
              tagName === 'br') {
            normalInsert('html', []);
            insertionMode = insertionModes.beforeHead;
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            normalInsert('html', []);
            insertionMode = insertionModes.beforeHead;
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          normalInsert('html', []);
          insertionMode = insertionModes.beforeHead;
          insertionMode.endOfFile();
        }
      },
      beforeHead: {
        toString: function () { return "before head"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else if (tagName === 'head') {
            normalInsert(tagName, attribs);
            insertionMode = insertionModes.inHead;
          } else {
            insertionMode.startTag('head', []);
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'head' || tagName === 'body' || tagName === 'html' ||
              tagName === 'br') {
            insertionMode.startTag('head', []);
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode.startTag('head', []);
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          insertionMode.startTag('head', []);
          insertionMode.endOfFile();
        }
      },
      inHead: {
        toString: function () { return "in head"; },
        startTag: function (tagName, attribs, marker, continuation) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else if (tagName === 'base' || tagName === 'basefont' ||
                     tagName === 'bgsound' || tagName === 'link') {
            // Define a stylesheet for <link>
            if (tagName === 'link') {
              // Link types are case insensitive
              var rel = lookupAttr(attribs, 'rel');
              var href = lookupAttr(attribs, 'href');
              var rels = rel ? String(rel).toLowerCase().split(' ') : [];
              if (href && rels.indexOf('stylesheet') >= 0) {
                var res = resolveUriRelativeToDocument(href);
                var media = lookupAttr(attribs, 'media');
                media = media ? sanitizeMediaQuery(lexCss(media)) : '';
                // Nonconformant and visible to the guest, but needed
                var styleElement = insertionPoint.ownerDocument
                    .createElement('style');
                insertionPoint.appendChild(styleElement);
                defineUntrustedExternalStylesheet(
                    res, styleElement, marker, media, continuation);
              }
            }

            // "Insert an HTML element for the token."
            normalInsert(tagName, attribs);

            // "Immediately pop the current node off the stack of open
            // elements."
            // (Currently handled inside of normalInsert using the .empty flag.
            // TODO(kpreid): Be HTML5 conformant in this aspect.)
            //insertionPoint = insertionPoint.parentElement;

            // "Acknowledge the token's self-closing flag, if it is set."
            // Not implemented.
          } else if (tagName === 'command' || tagName === 'meta' ||
                     tagName === 'noscript' || tagName === 'noframes') {
            // TODO(kpreid): Spec deviations for noscript, noframes, meta...
            normalInsert(tagName, attribs);
          } else if (tagName === 'title') {
            normalInsert(tagName, attribs);
            originalInsertionMode = insertionMode;
            insertionMode = insertionModes.text;
          } else if (tagName === 'style') {
            // "Follow the generic raw text element parsing algorithm."
            // "Insert an HTML element for the token."
            normalInsert(tagName, attribs);

            // "...switch the tokenizer to the RAWTEXT state..."
            // Handled before this stage.

            // "Let the original insertion mode be the current insertion mode."
            originalInsertionMode = insertionMode;

            pendingExternal = undefined;
            pendingDelayed = false;

            // "Then, switch the insertion mode to "text"."
            insertionMode = insertionModes.text;

            pendingMedia = lookupAttr(attribs, 'media');
            pendingMedia = pendingMedia
                ? sanitizeMediaQuery(lexCss(pendingMedia)) : '';
          } else if (tagName === 'script') {
            // "Create an element for the token in the HTML namespace."
            // "Mark the element as being "parser-inserted" and unset the
            // element's "force-async" flag."
            // "If the parser was originally created for the HTML fragment
            // parsing algorithm, then mark the script element as "already
            // started". (fragment case)"
            // "Append the new element to the current node and push it onto the
            // stack of open elements."
            // Note: We don't implement the mentioned flags so we can just merge
            // the steps into a normalInsert.
            // Note: src= will be filtered out by the whitelist.
            // Note: normalInsert mutates attribs, so we copy in this case.
            normalInsert(tagName, attribs.slice());

            // "Switch the tokenizer to the script data state."
            // This is internally done by the SAX parser.

            // "Let the original insertion mode be the current insertion mode."
            originalInsertionMode = insertionMode;

            // TODO(kpreid): Where in HTML5 is this side effect supposed to
            // occur, if at all? Should this actually be read out of the stashed
            // src attribute? Can we make this another "slow path attribute"
            // thing like normalInsert does for event handlers?
            var scriptSrc = lookupAttr(attribs, 'src');
            if (!scriptSrc) {
              // A script tag without a script src - use child node for source
              pendingExternal = undefined;
            } else {
              pendingExternal = scriptSrc;
            }
            pendingDelayed = (lookupAttr(attribs, 'defer') !== undefined
                || lookupAttr(attribs, 'async') !== undefined);

            // "Switch the insertion mode to "text"."
            insertionMode = insertionModes.text;
          } else if (tagName === 'head') {
            // "Parse error. Ignore the token."
          } else {
            insertionMode.endTag('head');
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'head') {
            insertionPoint = insertionPoint.parentElement;
            insertionMode = insertionModes.afterHead;
          } else if (tagName === 'body' || tagName === 'html' ||
              tagName === 'br') {
            insertionMode.endTag('head');
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode.endTag('head');
            insertionMode.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          insertionMode.endTag('head');
          insertionMode.endOfFile();
        }
      },
      afterHead: {
        toString: function () { return "after head"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else if (tagName === 'body') {
            normalInsert(tagName, attribs);
            insertionMode = insertionModes.inBody;
          // TODO(kpreid): Implement the "stuff that should be in head" case.
          } else if (tagName === 'head') {
            // "Parse error. Ignore the token."
          } else {
            insertionMode.startTag('body', []);
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'body' || tagName === 'html' || tagName === 'br') {
            insertionMode.startTag('body', []);
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // "Parse error. Ignore the token."
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            insertionMode.startTag('body', []);
            insertionMode.text.apply(undefined, arguments);
          } else {
            normalText(text);
          }
        },
        endOfFile: function() {
          insertionMode.startTag('body', []);
          insertionMode.endOfFile();
        }
      },
      inBody: {
        toString: function () { return "in body"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            // TODO(kpreid): Implement
            // "Parse error. For each attribute on the token, check to see if
            //  the attribute is already present on the top element of the stack
            //  of open elements. If it is not, add the attribute and its
            //  corresponding value to that element."
          } else if (tagName === 'base' || tagName === 'basefont' ||
              tagName === 'bgsound'     || tagName === 'command' ||
              tagName === 'link'        || tagName === 'meta' ||
              tagName === 'noframes'    || tagName === 'script' ||
              tagName === 'style'       || tagName === 'title') {
            insertionModes.inHead.startTag.apply(undefined, arguments);
          } else if (tagName === 'body') {
            // "Parse error."
            // TODO(kpreid): Implement attribute merging etc.
          } else {
            normalInsert(tagName, attribs);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'body') {
            // Yes, we really aren't moving the insertion point.
            insertionMode = insertionModes.afterBody;
          } else if (tagName === 'html') {
            insertionMode.endTag('body');
            insertionMode.endTag.apply(undefined, arguments);
          } else {
            // TODO(kpreid): Confirm vs spec'd "Any other end tag" handling
            normalEndTag(tagName);
          }
        },
        text: function (text) {
          normalText(text);
        },
        endOfFile: function() {
          // "If there is a node in the stack of open elements that is not
          // either a dd element, a dt element, an li element, a p element, a
          // tbody element, a td element, a tfoot element, a th element, a thead
          // element, a tr element, the body element, or the html element, then
          // this is a parse error.
          //
          // Stop parsing."
          stopParsing();
        }
      },
      text: {
        // Deviation from HTML5: When handling a <script> or <style>, does not
        // actually insert text content, to prevent unsandboxed interpretation.
        toString: function () { return "text"; },
        startTag: function (tagName, attribs) {
          throw new Error("shouldn't happen: start tag <" + tagName +
              "...> while in text insertion mode for " +
              insertionPoint.tagName);
        },
        endTag: function(tagName, marker, continuation) {
          var info;
          var node = insertionPoint;
          if (tagName === 'script') {
            if (node.tagName !== 'SCRIPT') {
              throw new Error('shouldn\'t happen: end tag </' + tagName +
                  '> while in text insertion mode for ' +
                  node.tagName);
            }

            // ...

            // "Pop the current node off the stack of open elements."
            normalEndTag(tagName);

            // "Switch the insertion mode to the original insertion mode."
            insertionMode = originalInsertionMode;

            // ...

            // "Execute the script."
            info = finishCdata();
            if (info.external) {
              var res = resolveUriRelativeToDocument(info.external);
              evaluateUntrustedExternalScript(
                  res, node, marker, continuation, info.delayed);
            } else {
              evaluateUntrustedScript(
                  domicile.pseudoLocation.href, info.text, node, info.delayed);
            }
          } else {
            if (tagName === 'style') {
              info = finishCdata();
              var media = pendingMedia;
              pendingMedia = '';
              // no info.external since URL'd stylesheets are defined with
              // <link>, not <style>.
              defineUntrustedStylesheet(domicile.pseudoLocation.href,
                  info.text, node, media);
            }

            // "Pop the current node off the stack of open elements."
            normalEndTag(tagName);

            // "Switch the insertion mode to the original insertion mode."
            insertionMode = originalInsertionMode;
          }
        },
        text: function(text) {
          var inSpecial = insertionPoint.tagName === 'STYLE' ||
              insertionPoint.tagName === 'SCRIPT';
          if (inSpecial) {
            // If we were to insert this content into the DOM, it might be
            // executed outside the sandbox.
            cdataContent.push(text);
          } else {
            normalText(text);
          }
        },
        endOfFile: function() {
          // "Parse error."

          // "If the current node is a script element, mark the script element
          // as "already started"."
          // TODO(kpreid): Implement said flag.

          // "Pop the current node off the stack of open elements."
          normalEndTag(insertionPoint.tagName);

          // "Switch the insertion mode to the original insertion mode and
          // reprocess the current token."
          insertionMode = originalInsertionMode;
          insertionMode.endOfFile();
        }
      },
      afterBody: {
        toString: function () { return "after body"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else {
            // "Parse error."
            insertionMode = insertionModes.inBody;
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          if (tagName === 'html') {
            insertionMode = insertionModes.afterAfterBody;
          } else {
            insertionMode = insertionModes.inBody;
            insertionMode.endTag.apply(undefined, arguments);
          }
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            // "Parse error."
            insertionMode = insertionModes.inBody;
          }
          insertionModes.inBody.text.apply(undefined, arguments);
        },
        endOfFile: function() {
          // "Stop parsing."
          stopParsing();
        }
      },
      afterAfterBody: {
        toString: function () { return "after after body"; },
        startTag: function (tagName, attribs) {
          if (tagName === 'html') {
            insertionModes.inBody.startTag.apply(undefined, arguments);
          } else {
            // "Parse error."
            insertionMode = insertionModes.inBody;
            insertionMode.startTag.apply(undefined, arguments);
          }
        },
        endTag: function (tagName) {
          // "Parse error."
          insertionMode = insertionModes.inBody;
          insertionMode.endTag.apply(undefined, arguments);
        },
        text: function (text) {
          if (isHtml5NonWhitespace(text)) {
            // "Parse error."
            insertionMode = insertionModes.inBody;
            insertionMode.text.apply(undefined, arguments);
          } else {
            insertionModes.inBody.text.apply(undefined, arguments);
          }
        },
        endOfFile: function() {
          // "Stop parsing."
          stopParsing();
        }
      }
    };
    var insertionMode = insertionModes.initial;
    var originalInsertionMode = null;

    function docSection(el) {
      for (;;) {
        if (!el || el === base) { return ['doc', el]; }
        var tn = virtTagName(el);
        if (tn === 'html' || tn === 'head' || tn === 'body') {
          return [tn, el];
        }
        el = el.parentNode;
      }
    }

    /**
     * Given that attach() has updated the insertionPoint, change the
     * insertionMode to a suitable value.
     */
    updateInsertionMode = function updateInsertionMode_() {
      // Note: This algorithm was made from scratch and does NOT reflect the
      // HTML5 specification.

      // The basic idea is that every document must have an html
      // element that contains a head element and a body element,
      // so the current insertionMode depends on where we are in
      // the existing document, and also on what already exists
      // in the document. The complication is we want to do
      // something sensible if the document is malformed.

      var sect = docSection(insertionPoint);
      switch (sect[0]) {
        case 'doc':
          if (hasChild(sect[1], 'html')) {
            insertionMode = insertionModes.afterAfterBody;
          } else {
            insertionMode = insertionModes.beforeHtml;
          }
          break;
        case 'head':
          insertionMode = insertionModes.inHead;
          break;
        case 'body':
          insertionMode = insertionModes.inBody;
          break;
        case 'html':
          if (hasChild(sect[1], 'body')) {
            insertionMode = insertionModes.afterBody;
          } else if (hasChild(sect[1], 'head')) {
            insertionMode = insertionModes.afterHead;
          } else {
            insertionMode = insertionModes.beforeHead;
          }
          break;
        default: throw new Error('bug');
      }
    };

    notifyEOF = function notifyEOF_() {
      if (insertionPoint) {
        // Act on HTML5 "end-of-file token".
        insertionMode.endOfFile();
      }
    };

    /**
     * This corresponds to document.open() and is an extremely incomplete
     * implementation thereof.
     * http://www.whatwg.org/specs/web-apps/current-work/multipage/elements.html#dom-document-open
     */
    function reopen() {
      while (base.firstChild) {
        base.removeChild(base.firstChild);
      }
      insertionPoint = base;
      insertionMode = insertionModes.initial;
      originalInsertionMode = null;
      // no need to reinitialize idMap and detached, because this is only for
      // guest-driven writing.
    }

    var documentWriter = {
      startDoc: function() {
        // TODO(jasvir): Fix recursive document.write
        if (depth == 0) {
          documentLoaded = Q.defer();
        }
        depth++;
      },
      endDoc: function () {
        depth--;
        if (depth == 0) {
          // TODO(kpreid): I think this is wrong or at least simply unnecessary;
          // we should hook everything document-load-done-related into finish()
          // rather than bothering to 'guess' the end via nesting level here
          // Unify/reconcile the following:
          //   * this
          //   * actions taken by stopParsing()
          //   * actions taken by finish()
          documentLoaded.resolve(true);
        }
      },
      startTag: function (tagName, attribs, params, marker, continuation) {
        var schemaElem = htmlSchema.element(tagName);
        if (!schemaElem.allowed) {
          if (tagName === 'script' || tagName === 'style') {
            // Continue, let element be inserted. (Script and style elements are
            // marked as disallowed in the schema because their text content is
            // powerful, so they are explicitly special-cased in any code
            // prepared to deal with them.)
          } else if (tagName === 'base') {
            var baseHref = lookupAttr(attribs, 'href');
            if (baseHref && domicile) {
              domicile.setBaseUri(resolveUriRelativeToDocument(baseHref));
            }
            return; // TODO(kpreid): Remove, allow virtualized element
          } else if (schemaElem.shouldVirtualize) {
            // virtualization will be handled by normalInsert
          } else {
            // Ignore tags which are unsafe, not to be virtualized, and not
            // handled by one of the above special cases.
            return;
          }
        }
        insertionMode.startTag(tagName, attribs, marker, continuation);
      },
      endTag: function (tagName, optional, marker, continuation) {
        insertionMode.endTag(tagName, marker, continuation);
      },
      pcdata: function (text) {
        insertionMode.text(text);
      },
      cdata: function (text) {
        insertionMode.text(text);
      }
    };
    documentWriter.rcdata = documentWriter.pcdata;

    var htmlParser = html.makeSaxParser(documentWriter);

    // Document.write and document.writeln behave as described at
    // http://www.w3.org/TR/2009/WD-html5-20090825/embedded-content-0.html#dom-document-write
    // but with a few differences:
    // (1) all HTML written is sanitized per the opt_domicile's HTML
    //     sanitizer
    // (2) HTML written cannot change where subsequent static HTML is emitted.
    // (3) document.write cannot be used to inject scripts, so the
    //     "if there is a pending external script" does not apply.
    //     TODO(kpreid): This is going to change in the SES/client-side case.
    /**
     * A tame version of document.write.
     * @param html_varargs according to HTML5, the input to document.write is
     *     varargs, and the HTML is the concatenation of all the arguments.
     */
    var tameDocWrite = function write(htmlPieces) {
      // TODO: Do we need to fail early if documentLoaded is undefined.
      var htmlText = concat(arguments);
      if (!insertionPoint) {
        reopen();
      }
      // A <script> or <style> element started in one document.write and
      // continues in this one as in
      //   document.write('<script>foo');
      //   document.write('(bar)</script>');
      // so we need to trick the SAX parser into a CDATA context.
      if (insertionPoint.tagName === 'SCRIPT') {
        htmlText = '<script>' + htmlText;
      } else if (insertionPoint.tagName === 'STYLE') {
        htmlText = '<style>' + htmlText;
      }
      htmlParser(htmlText);
      return documentLoaded.promise;
    };
    domicile.writeHook = cajaVM.def({
      open: reopen,
      close: finish,
      write: tameDocWrite
    });
    domicile.evaluateUntrustedExternalScript =
      cajaVM.def(evaluateUntrustedExternalScript);
  })(opt_domicile);
}

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['HtmlEmitter'] = HtmlEmitter;
}
