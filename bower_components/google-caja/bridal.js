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
 * A set of utility functions that implement browser feature testing to unify
 * certain DOM behaviors, and a set of recommendations about when to use these
 * functions as opposed to the native DOM functions.
 *
 * @author ihab.awad@gmail.com
 * @author jasvir@gmail.com
 * @provides bridalMaker
 * @requires WeakMap, html, html4
 * @overrides window
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * Construct the bridal object for a specific document.
 *
 * @param {Node} targetDocNode The document to manipulate, or some node owned
 *     by it.
 */
var bridalMaker = function (targetDocNode) {
  var document = targetDocNode.nodeType === 9 ? targetDocNode :
      targetDocNode.ownerDocument;

  var window = bridalMaker.getWindow(document);
  var navigator      = window.navigator;
  var XMLHttpRequest = window.XMLHttpRequest;
  var ActiveXObject  = window.ActiveXObject;

  ////////////////////////////////////////////////////////////////////////////
  // Private section
  ////////////////////////////////////////////////////////////////////////////

  var isOpera = navigator.userAgent.indexOf('Opera') === 0;
  var isIE = !isOpera && navigator.userAgent.indexOf('MSIE') !== -1;
  var isWebkit = !isOpera && navigator.userAgent.indexOf('WebKit') !== -1;

  var featureAttachEvent = !!(window.attachEvent && !window.addEventListener);
  /**
   * Does the extended form of extendedCreateElement work?
   * From http://msdn.microsoft.com/en-us/library/ms536389.aspx :<blockquote>
   *     You can also specify all the attributes inside the createElement
   *     method by using an HTML string for the method argument.
   *     The following example demonstrates how to dynamically create two
   *     radio buttons utilizing this technique.
   *     <pre>
   *     ...
   *     var newRadioButton = document.createElement(
   *         "&lt;INPUT TYPE='RADIO' NAME='RADIOTEST' VALUE='First Choice'>")
   *     </pre>
   * </blockquote>
   */
  var featureExtendedCreateElement =
      (function () {
        try {
          return (
              document.createElement('<input type="radio">').type === 'radio');
        } catch (e) {
          return false;
        }
      })();

  // HTML5 compatibility on IE
  // Standard html5 but non-html4 tags cause IE to throw
  // Workaround from http://remysharp.com/html5-enabling-script
  function html5shim() {
    var html5_elements =["abbr", "article", "aside", "audio", "canvas",
        "details", "figcaption", "figure", "footer", "header", "hgroup", "mark",
        "meter", "nav", "output", "progress", "section", "summary", "time",
        "video"];
    var documentFragment = document.createDocumentFragment();
    for (var i = 0; i < html5_elements.length; i++) {
      try {
        document.createElement(html5_elements[i]);
        documentFragment.createElement(html5_elements[i]);
      } catch (e) {
        // failure in the shim is not a real failure
      }
    }
  }
  if (isIE) {
    html5shim();
  }

  // lazily initialized to allow working in cases where WeakMap is not available
  // and this code is never used.
  var hiddenEventTypes;

  var CUSTOM_EVENT_TYPE_SUFFIX = '_custom___';
  function tameEventType(type, opt_isCustom, opt_tagName) {
    type = String(type);
    if (endsWithUnderbars.test(type)) {
      throw new Error('Invalid event type ' + type);
    }
    var tagAttr = false;
    if (opt_tagName) {
      tagAttr = String(opt_tagName).toLowerCase() + '::on' + type;
    }
    if (!opt_isCustom
        && ((tagAttr && html4.atype.SCRIPT === html4.ATTRIBS[tagAttr])
            || html4.atype.SCRIPT === html4.ATTRIBS['*::on' + type])) {
      return type;
    }
    return type + CUSTOM_EVENT_TYPE_SUFFIX;
  }

  function eventHandlerTypeFilter(handler, tameType) {
    // This does not need to check that handler is callable by untrusted code
    // since the handler will invoke plugin_dispatchEvent which will do that
    // check on the untrusted function reference.
    return function (event) {
      if (hiddenEventTypes && tameType === hiddenEventTypes.get(event)) {
        return handler.call(this, event);
      }
    };
  }

  var endsWithUnderbars = /__$/;
  var escapeAttrib = html.escapeAttrib;
  function constructClone(node, deep) {
    var clone;
    if (node.nodeType === 1 && featureExtendedCreateElement) {
      // From http://blog.pengoworks.com/index.cfm/2007/7/16/IE6--IE7-quirks-with-cloneNode-and-form-elements
      //     It turns out IE 6/7 doesn't properly clone some form elements
      //     when you use the cloneNode(true) and the form element is a
      //     checkbox, radio or select element.
      // JQuery provides a clone method which attempts to fix this and an issue
      // with event listeners.  According to the source code for JQuery's clone
      // method ( http://docs.jquery.com/Manipulation/clone#true ):
      //     IE copies events bound via attachEvent when
      //     using cloneNode. Calling detachEvent on the
      //     clone will also remove the events from the orignal
      // We do not need to deal with XHTML DOMs and so can skip the clean step
      // that jQuery does.
      var tagDesc = node.tagName;
      // Copying form state is not strictly mentioned in DOM2's spec of
      // cloneNode, but all implementations do it.  The value copying
      // can be interpreted as fixing implementations' failure to have
      // the value attribute "reflect" the input's value as determined by the
      // value property.
      switch (node.tagName) {
        case 'INPUT':
          tagDesc = '<input name="' + escapeAttrib(node.name)
              + '" type="' + escapeAttrib(node.type)
              + '" value="' + escapeAttrib(node.defaultValue) + '"'
              + (node.defaultChecked ? ' checked="checked">' : '>');
          break;
        case 'BUTTON':
          tagDesc = '<button name="' + escapeAttrib(node.name)
              + '" type="' + escapeAttrib(node.type)
              + '" value="' + escapeAttrib(node.value) + '">';
          break;
        case 'OPTION':
          tagDesc = '<option '
              + (node.defaultSelected ? ' selected="selected">' : '>');
          break;
        case 'TEXTAREA':
          tagDesc = '<textarea value="'
              + escapeAttrib(node.defaultValue) + '">';
          break;
      }

      clone = document.createElement(tagDesc);

      var attrs = node.attributes;
      for (var i = 0, attr; (attr = attrs[i]); ++i) {
        if (attr.specified && !endsWithUnderbars.test(attr.name)) {
          setAttribute(clone, attr.nodeName, attr.nodeValue);
        }
      }
    } else {
      clone = node.cloneNode(false);
    }
    if (deep) {
      // TODO(mikesamuel): should we whitelist nodes here, to e.g. prevent
      // untrusted code from reloading an already loaded script by cloning
      // a script node that somehow exists in a tree accessible to it?
      for (var child = node.firstChild; child; child = child.nextSibling) {
        var cloneChild = constructClone(child, deep);
        clone.appendChild(cloneChild);
      }
    }
    return clone;
  }

  function fixupClone(node, clone) {
    for (var child = node.firstChild, cloneChild = clone.firstChild; cloneChild;
         child = child.nextSibling, cloneChild = cloneChild.nextSibling) {
      fixupClone(child, cloneChild);
    }
    if (node.nodeType === 1) {
      switch (node.tagName) {
        case 'INPUT':
          clone.value = node.value;
          clone.checked = node.checked;
          break;
        case 'OPTION':
          clone.selected = node.selected;
          clone.value = node.value;
          break;
        case 'TEXTAREA':
          clone.value = node.value;
          break;
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // Public section
  ////////////////////////////////////////////////////////////////////////////

  function untameEventType(type) {
    var suffix = CUSTOM_EVENT_TYPE_SUFFIX;
    var tlen = type.length, slen = suffix.length;
    var end = tlen - slen;
    if (end >= 0 && suffix === type.substring(end)) {
      type = type.substring(0, end);
    }
    return type;
  }

  function initEvent(event, methodName, type, bubbles, cancelable, args, notCustom) {
    methodName = String(methodName);
    type = tameEventType(type, !notCustom);
    bubbles = Boolean(bubbles);
    cancelable = Boolean(cancelable);

    if (methodName in event) { // Non-IE, specialized init such as initMouseEvent
      var method = event[methodName];
      if (typeof method !== 'function') {
        // we don't expect this to happen, but if it does, explain
        throw new Error('Domado internal error: event.' + methodName +
            ' exists but is a ' + typeof method + ', not a function');
      }
      method.apply(event, [type, bubbles, cancelable].concat(args));
    } else if (event.initEvent) {  // Non-IE
      event.initEvent(type, bubbles, cancelable);
    } else if (bubbles && cancelable) {  // IE
      // TODO(kpreid): How do we handle args?
      if (!hiddenEventTypes) {
        hiddenEventTypes = new WeakMap();
      }
      hiddenEventTypes.set(event, type);
    } else {
      // TODO(mikesamuel): can bubbling and cancelable on events be simulated
      // via http://msdn.microsoft.com/en-us/library/ms533545(VS.85).aspx
      throw new Error(
          'Browser does not support non-bubbling/uncanceleable events');
    }
  }

  function dispatchEvent(element, event) {
    // TODO(mikesamuel): when we change event dispatching to happen
    // asynchronously, we should exempt custom events since those
    // need to return a useful value, and there may be code bracketing
    // them which could observe asynchronous dispatch.

    // "The return value of dispatchEvent indicates whether any of
    //  the listeners which handled the event called
    //  preventDefault. If preventDefault was called the value is
    //  false, else the value is true."
    if (element.dispatchEvent) {
      return Boolean(element.dispatchEvent(event));
    } else {
      // Only dispatches custom events as when tameEventType(t) !== t.
      element.fireEvent('ondataavailable', event);
      return Boolean(event.returnValue);
    }
  }

  /**
   * Add an event listener function to an element.
   *
   * <p>Replaces
   * W3C <code>Element::addEventListener</code> and
   * IE <code>Element::attachEvent</code>, as well as the corresponding remove
   * operations (see return value).
   *
   * @param {HTMLElement} element a native DOM element.
   * @param {string} type a string identifying the event type.
   * @param {boolean Element::function (event)} handler an event handler.
   * @param {boolean} useCapture whether the user wishes to initiate capture.
   * @return {function} A function which performs the corresponding
   *         removeEventListener. Due to wrappers, removeEventListener cannot
   *         be used directly.
   */
  function addEventListener(element, type, handler, useCapture) {
    type = String(type);
    var tameType = tameEventType(type, false, element.tagName);
    var isNowCustom = type !== tameType;
    var r1 = subAddEventListener(element, isNowCustom, tameType, handler,
        useCapture);
    var r2 = null;
    if (!isNowCustom) {
      r2 = subAddEventListener(element, true,
          tameEventType(type, true, element.tagName), handler, useCapture);
    }
    return r2 ? function removeBoth() { r1(); r2(); } : r1;
  }
  function subAddEventListener(
      element, isCustom, tameType, handler, useCapture) {
    if (featureAttachEvent) {
      // TODO(ihab.awad): How do we emulate 'useCapture' here?
      if (isCustom) {
        var wrapper = eventHandlerTypeFilter(handler, tameType);
        element.attachEvent('ondataavailable', wrapper);
        return function() {
          element.detachEvent('ondataavailable', wrapper);
        };
      } else {
        element.attachEvent('on' + tameType, handler);
        return function() {
          element.detachEvent('on' + tameType, handler);
        };
      }
    } else {
      // FF2 fails if useCapture not passed or is not a boolean.
      element.addEventListener(tameType, handler, useCapture);
      return function() {
        element.removeEventListener(tameType, handler, useCapture);
      };
    }
  }

  /**
   * Clones a node per {@code Node.clone()}.
   * <p>
   * Returns a duplicate of this node, i.e., serves as a generic copy
   * constructor for nodes. The duplicate node has no parent;
   * (parentNode is null.).
   * <p>
   * Cloning an Element copies all attributes and their values,
   * including those generated by the XML processor to represent
   * defaulted attributes, but this method does not copy any text it
   * contains unless it is a deep clone, since the text is contained
   * in a child Text node. Cloning an Attribute directly, as opposed
   * to be cloned as part of an Element cloning operation, returns a
   * specified attribute (specified is true). Cloning any other type
   * of node simply returns a copy of this node.
   * <p>
   * Note that cloning an immutable subtree results in a mutable copy,
   * but the children of an EntityReference clone are readonly. In
   * addition, clones of unspecified Attr nodes are specified. And,
   * cloning Document, DocumentType, Entity, and Notation nodes is
   * implementation dependent.
   *
   * @param {boolean} deep If true, recursively clone the subtree
   * under the specified node; if false, clone only the node itself
   * (and its attributes, if it is an Element).
   *
   * @return {Node} The duplicate node.
   */
  function cloneNode(node, deep) {
    var clone;
    if (!document.all) {  // Not IE 6 or IE 7
      clone = node.cloneNode(deep);
    } else {
      clone = constructClone(node, deep);
    }
    fixupClone(node, clone);
    return clone;
  }

  function initCanvasElements(doc) {
    var els = doc.getElementsByTagName('canvas');
    for (var i = 0; i < els.length; i++) {
      initCanvasElement(els[i]);
    }
  }

  function initCanvasElement(el) {
    // TODO(felix8a): need to whitelist G_vmlCanvasManager
    if (window.G_vmlCanvasManager) {
      window.G_vmlCanvasManager.initElement(el);
    }
  }

  function createElement(tagName, attribs) {
    if (featureExtendedCreateElement) {
      var tag = ['<', tagName];
      for (var i = 0, n = attribs.length; i < n; i += 2) {
        tag.push(' ', attribs[i], '="', escapeAttrib(attribs[i + 1]), '"');
      }
      tag.push('>');
      return document.createElement(tag.join(''));
    } else {
      var el = document.createElement(tagName);
      for (var i = 0, n = attribs.length; i < n; i += 2) {
        setAttribute(el, attribs[i], attribs[i + 1]);
      }
      return el;
    }
  }

  /**
   * Create a <code>style</code> element for a document containing some
   * specified CSS text. Does not add the element to the document: the client
   * may do this separately if desired.
   *
   * <p>Replaces directly creating the <code>style</code> element and
   * populating its contents.
   *
   * @param document a DOM document.
   * @param cssText a string containing a well-formed stylesheet production.
   * @return a <code>style</code> element for the specified document.
   */
  function createStylesheet(document, cssText) {
    // Courtesy Stoyan Stefanov who documents the derivation of this at
    // http://www.phpied.com/dynamic-script-and-style-elements-in-ie/ and
    // http://yuiblog.com/blog/2007/06/07/style/
    var styleSheet = document.createElement('style');
    styleSheet.setAttribute('type', 'text/css');
    var ssss = styleSheet.styleSheet;
    if (ssss) {   // IE
      ssss.cssText = cssText;
    } else {                // the world
      styleSheet.appendChild(document.createTextNode(cssText));
    }
    return styleSheet;
  }

  var hiddenStoredTarget;

  /**
   * Set an attribute on a DOM node.
   *
   * <p>Replaces DOM <code>Node::setAttribute</code>.
   *
   * @param {HTMLElement} element a DOM element.
   * @param {string} name the name of an attribute.
   * @param {string} value the value of an attribute.
   */
  function setAttribute(element, name, value) {
    /*
      Hazards:

        - In IE[67], el.setAttribute doesn't work for attributes like
          'class' or 'for'.  IE[67] expects you to set 'className' or
          'htmlFor'.  Using setAttributeNode solves this problem.

        - In IE[67], <input> elements can shadow attributes.  If el is a
          form that contains an <input> named x, then el.setAttribute(x, y)
          will set x's value rather than setting el's attribute.  Using
          setAttributeNode solves this problem.

        - In IE[67], the style attribute can only be modified by setting
          el.style.cssText.  Neither setAttribute nor setAttributeNode will
          work.  el.style.cssText isn't bullet-proof, since it can be
          shadowed by <input> elements.

        - In IE[67], you can never change the type of an <button> element.
          setAttribute('type') silently fails, but setAttributeNode
          throws an exception.  We want the silent failure.

        - In IE[67], you can never change the type of an <input> element.
          setAttribute('type') throws an exception.  We want the exception.

        - In IE[67], setAttribute is case-sensitive, unless you pass 0 as a
          3rd argument.  setAttributeNode is case-insensitive.

        - Trying to set an invalid name like ":" is supposed to throw an
          error.  In IE[678] and Opera 10, it fails without an error.
    */
    switch (name) {
      case 'style':
        element.style.cssText = value;
        return value;
      // Firefox will run javascript: URLs in the frame specified by target.
      // This can cause things to run in an unintended frame, so we make sure
      // that the target is effectively _self whenever a javascript: URL appears
      // on a node.
      case 'href':
        if (/^javascript:/i.test(value)) {
          if (!hiddenStoredTarget) {
            hiddenStoredTarget = new WeakMap();
          }
          hiddenStoredTarget.set(element, element.target);
          element.target = '';
        } else if (hiddenStoredTarget && hiddenStoredTarget.has(element)) {
          element.target = hiddenStoredTarget.get(element);
          hiddenStoredTarget["delete"](element); //delete kw rej. by Safari5.0.5
        }
        break;
      case 'target':
        if (element.href && /^javascript:/i.test(element.href)) {
          if (!hiddenStoredTarget) {
            hiddenStoredTarget = new WeakMap();
          }
          hiddenStoredTarget.set(element, value);
          return value;
        }
        break;
    }
    if (featureExtendedCreateElement /* old IE, need workarounds */) {
      try {
        var attr = element.ownerDocument.createAttribute(name);
        attr.value = value;
        element.setAttributeNode(attr);
      } catch (e) {
        // It's a real failure only if setAttribute also fails.
        return element.setAttribute(name, value, 0);
      }
    } else {
      return element.setAttribute(name, value, 0);
    }
    return value;
  }

  /**
   * See <a href="http://www.w3.org/TR/cssom-view/#the-getclientrects"
   *      >ElementView.getBoundingClientRect()</a>.
   * @param {Node} el An element or document.
   * @return {Object} duck types as a TextRectangle with numeric fields
   *    {@code left}, {@code right}, {@code top}, and {@code bottom}.
   */
  function getBoundingClientRect(el) {
    if (el.nodeType === 9 /* Document */) {
      el = el.documentElement;
    }
    var doc = el.ownerDocument;
    // Use the native method if present.
    if (el.getBoundingClientRect) {
      var cRect = el.getBoundingClientRect();
      if (isIE) {
        // IE has an unnecessary border, which can be mucked with by styles, so
        // the amount of border is not predictable.
        // Depending on whether the document is in quirks or standards mode,
        // the border will be present on either the HTML or BODY elements.
        var fixupLeft = doc.documentElement.clientLeft + doc.body.clientLeft;
        cRect.left -= fixupLeft;
        cRect.right -= fixupLeft;
        var fixupTop = doc.documentElement.clientTop + doc.body.clientTop;
        cRect.top -= fixupTop;
        cRect.bottom -= fixupTop;
      }
      return ({
                top: +cRect.top,
                left: +cRect.left,
                right: +cRect.right,
                bottom: +cRect.bottom
              });
    }

    // Otherwise, try using the deprecated gecko method, or emulate it in
    // horribly inefficient ways.

    // http://code.google.com/p/doctype/wiki/ArticleClientViewportElement
    var viewport = (isIE && doc.compatMode === 'CSS1Compat')
        ? doc.body : doc.documentElement;

    // Figure out the position relative to the viewport.
    // From http://code.google.com/p/doctype/wiki/ArticlePageOffset
    var pageX = 0, pageY = 0;
    if (el === viewport) {
      // The viewport is the origin.
    } else if (doc.getBoxObjectFor) {  // Handles Firefox < 3
      var elBoxObject = doc.getBoxObjectFor(el);
      var viewPortBoxObject = doc.getBoxObjectFor(viewport);
      pageX = elBoxObject.screenX - viewPortBoxObject.screenX;
      pageY = elBoxObject.screenY - viewPortBoxObject.screenY;
    } else {
      // Walk the offsetParent chain adding up offsets.
      for (var op = el; (op && op !== el); op = op.offsetParent) {
        pageX += op.offsetLeft;
        pageY += op.offsetTop;
        if (op !== el) {
          pageX += op.clientLeft || 0;
          pageY += op.clientTop || 0;
        }
        if (isWebkit) {
          // On webkit the offsets for position:fixed elements are off by the
          // scroll offset.
          var opPosition = doc.defaultView.getComputedStyle(op, 'position');
          if (opPosition === 'fixed') {
            pageX += doc.body.scrollLeft;
            pageY += doc.body.scrollTop;
          }
          break;
        }
      }

      // Opera & (safari absolute) incorrectly account for body offsetTop
      if ((isWebkit
           && doc.defaultView.getComputedStyle(el, 'position') === 'absolute')
          || isOpera) {
        pageY -= doc.body.offsetTop;
      }

      // Accumulate the scroll positions for everything but the body element
      for (var op = el; (op = op.offsetParent) && op !== doc.body;) {
        pageX -= op.scrollLeft;
        // see https://bugs.opera.com/show_bug.cgi?id=249965
        if (!isOpera || op.tagName !== 'TR') {
          pageY -= op.scrollTop;
        }
      }
    }

    // Figure out the viewport container so we can subtract the window's
    // scroll offsets.
    var scrollEl = !isWebkit && doc.compatMode === 'CSS1Compat'
        ? doc.documentElement
        : doc.body;

    var left = pageX - scrollEl.scrollLeft, top = pageY - scrollEl.scrollTop;
    return ({
              top: top,
              left: left,
              right: left + el.clientWidth,
              bottom: top + el.clientHeight
            });
  }

  /**
   * Returns the value of the named attribute on element.
   *
   * <p> In IE[67], if you have
   * <pre>
   *    <form id="f" foo="x"><input name="foo"></form>
   * </pre>
   * then f.foo is the input node,
   * and f.getAttribute('foo') is also the input node,
   * which is contrary to the DOM spec and the behavior of other browsers.
   *
   * <p> This function tries to get a reliable value.
   *
   * <p> In IE[67], getting 'style' may be unreliable for form elements.
   *
   * @param {HTMLElement} element a DOM element.
   * @param {string} name the name of an attribute.
   */
  function getAttribute(element, name) {
    // In IE[67], element.style.cssText seems to be the only way to get the
    // value string.  This unfortunately fails when element.style is an
    // input element instead of a style object.
    if (name === 'style') {
      var style = element.style;
      if (typeof style.cssText === 'string') {
        return style.cssText;
      }
    }
    var attr = element.getAttributeNode(name);
    if (attr && attr.specified) {
      return attr.value;
    } else {
      return null;
    }
  }

  function hasAttribute(element, name) {
    if (element.hasAttribute) {  // Non IE
      return element.hasAttribute(name);
    } else {
      var attr = element.getAttributeNode(name);
      return attr !== null && attr.specified;
    }
  }

  /**
   * Returns a "computed style" object for a DOM node.
   *
   * @param {HTMLElement element a DOM element.
   * @param {string} pseudoElement an optional pseudo-element selector,
   * such as ":first-child".
   */
  function getComputedStyle(element, pseudoElement) {
    if (element.currentStyle && pseudoElement === void 0) {
      return element.currentStyle;
    } else if (window.getComputedStyle) {
      return window.getComputedStyle(element, pseudoElement);
    } else {
      throw new Error(
          'Computed style not available for pseudo element '
          + pseudoElement);
    }
  }

  /**
   * Returns a new XMLHttpRequest object, hiding browser differences in the
   * method of construction.
   */
  function makeXhr() {
    if (typeof XMLHttpRequest === 'undefined') {
      var activeXClassIds = [
          'MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0',
          'MSXML2.XMLHTTP', 'MICROSOFT.XMLHTTP.1.0', 'MICROSOFT.XMLHTTP.1',
          'MICROSOFT.XMLHTTP'];
      for (var i = 0, n = activeXClassIds.length; i < n; i++) {
        var candidate = activeXClassIds[i];
        try {
          return new ActiveXObject(candidate);
        } catch (e) {}
      }
    }
    return new XMLHttpRequest;
  }

  return {
    addEventListener: addEventListener,
    initEvent: initEvent,
    dispatchEvent: dispatchEvent,
    cloneNode: cloneNode,
    createElement: createElement,
    createStylesheet: createStylesheet,
    setAttribute: setAttribute,
    getAttribute: getAttribute,
    hasAttribute: hasAttribute,
    getBoundingClientRect: getBoundingClientRect,
    untameEventType: untameEventType,
    extendedCreateElementFeature: featureExtendedCreateElement,
    getComputedStyle: getComputedStyle,
    makeXhr: makeXhr,
    initCanvasElement: initCanvasElement,
    initCanvasElements: initCanvasElements
  };
};

// TODO(kpreid): Kludge. Old Domita used global bridal.getWindow, but global
// bridal no longer exists since it used ambient authority. We should have a
// proper object to stick this on.
/**
 * Returns the window containing this element.
 */
bridalMaker.getWindow = function(node) {
  var doc = node.nodeType === 9  // Document node
      ? node
      : node.ownerDocument;
  // IE
  if (doc.parentWindow) { return doc.parentWindow; }
  // Everything else
  // TODO: Safari 2's defaultView wasn't a window object :(
  // Safari 2 is not A-grade, though.
  if (doc.defaultView) { return doc.defaultView; }
  // Just in case
  var s = doc.createElement('script');
  s.innerHTML = "document.parentWindow = window;";
  var body = doc.body;
  body.appendChild(s);
  body.removeChild(s);
  return doc.parentWindow;
};

// Exports for closure compiler.
// TODO(felix8a): reduce internal linkage exposed as globals
if (typeof window !== 'undefined') {
  window['bridalMaker'] = bridalMaker;
}
