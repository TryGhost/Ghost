// Copyright (C) 2006 Google Inc.
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
 * This is a copy of html-sanitizer.js @r4805.  The current
 * html-sanitizer.js uses a faster but significantly different parsing
 * algorithm, so we're keeping this to check for regressions.
 */

/**
 * @fileoverview
 * An HTML sanitizer that can satisfy a variety of security policies.
 *
 * <p>
 * The HTML sanitizer is built around a SAX parser and HTML element and
 * attributes schemas.
 *
 * @author mikesamuel@gmail.com
 * \@requires html4
 * \@overrides window
 * \@provides html, html_sanitize
 */

/**
 * \@namespace
 */
var html = (function(html4) {
  var lcase;
  // The below may not be true on browsers in the Turkish locale.
  if ('script' === 'SCRIPT'.toLowerCase()) {
    lcase = function(s) { return s.toLowerCase(); };
  } else {
    /**
     * {\@updoc
     * $ lcase('SCRIPT')
     * # 'script'
     * $ lcase('script')
     * # 'script'
     * }
     */
    lcase = function(s) {
      return s.replace(
          /[A-Z]/g,
          function(ch) {
            return String.fromCharCode(ch.charCodeAt(0) | 32);
          });
    };
  }

  // The keys of this object must be 'quoted' or JSCompiler will mangle them!
  var ENTITIES = {
    'lt': '<',
    'gt': '>',
    'amp': '&',
    'nbsp': '\240',
    'quot': '"',
    'apos': '\''
  };

  // Schemes on which to defer to uripolicy. Urls with other schemes are denied
  var WHITELISTED_SCHEMES = /^(?:https?|mailto)$/i;

  var decimalEscapeRe = /^#(\d+)$/;
  var hexEscapeRe = /^#x([0-9A-Fa-f]+)$/;
  /**
   * Decodes an HTML entity.
   *
   * {\@updoc
   * $ lookupEntity('lt')
   * # '<'
   * $ lookupEntity('GT')
   * # '>'
   * $ lookupEntity('amp')
   * # '&'
   * $ lookupEntity('nbsp')
   * # '\xA0'
   * $ lookupEntity('apos')
   * # "'"
   * $ lookupEntity('quot')
   * # '"'
   * $ lookupEntity('#xa')
   * # '\n'
   * $ lookupEntity('#10')
   * # '\n'
   * $ lookupEntity('#x0a')
   * # '\n'
   * $ lookupEntity('#010')
   * # '\n'
   * $ lookupEntity('#x00A')
   * # '\n'
   * $ lookupEntity('Pi')      // Known failure
   * # '\u03A0'
   * $ lookupEntity('pi')      // Known failure
   * # '\u03C0'
   * }
   *
   * @param {string} name the content between the '&' and the ';'.
   * @return {string} a single unicode code-point as a string.
   */
  function lookupEntity(name) {
    name = lcase(name);  // TODO: &pi; is different from &Pi;
    if (ENTITIES.hasOwnProperty(name)) { return ENTITIES[name]; }
    var m = name.match(decimalEscapeRe);
    if (m) {
      return String.fromCharCode(parseInt(m[1], 10));
    } else if (!!(m = name.match(hexEscapeRe))) {
      return String.fromCharCode(parseInt(m[1], 16));
    }
    return '';
  }

  function decodeOneEntity(_, name) {
    return lookupEntity(name);
  }

  var nulRe = /\0/g;
  function stripNULs(s) {
    return s.replace(nulRe, '');
  }

  var entityRe = /&(#\d+|#x[0-9A-Fa-f]+|\w+);/g;
  /**
   * The plain text of a chunk of HTML CDATA which possibly containing.
   *
   * {\@updoc
   * $ unescapeEntities('')
   * # ''
   * $ unescapeEntities('hello World!')
   * # 'hello World!'
   * $ unescapeEntities('1 &lt; 2 &amp;&AMP; 4 &gt; 3&#10;')
   * # '1 < 2 && 4 > 3\n'
   * $ unescapeEntities('&lt;&lt <- unfinished entity&gt;')
   * # '<&lt <- unfinished entity>'
   * $ unescapeEntities('/foo?bar=baz&copy=true')  // & often unescaped in URLS
   * # '/foo?bar=baz&copy=true'
   * $ unescapeEntities('pi=&pi;&#x3c0;, Pi=&Pi;\u03A0') // FIXME: known failure
   * # 'pi=\u03C0\u03c0, Pi=\u03A0\u03A0'
   * }
   *
   * @param {string} s a chunk of HTML CDATA.  It must not start or end inside
   *     an HTML entity.
   */
  function unescapeEntities(s) {
    return s.replace(entityRe, decodeOneEntity);
  }

  var ampRe = /&/g;
  var looseAmpRe = /&([^a-z#]|#(?:[^0-9x]|x(?:[^0-9a-f]|$)|$)|$)/gi;
  var ltRe = /</g;
  var gtRe = />/g;
  var quotRe = /\"/g;

  /**
   * Escapes HTML special characters in attribute values.
   *
   * {\@updoc
   * $ escapeAttrib('')
   * # ''
   * $ escapeAttrib('"<<&==&>>"')  // Do not just escape the first occurrence.
   * # '&#34;&lt;&lt;&amp;&#61;&#61;&amp;&gt;&gt;&#34;'
   * $ escapeAttrib('Hello <World>!')
   * # 'Hello &lt;World&gt;!'
   * }
   */
  function escapeAttrib(s) {
    return ('' + s).replace(ampRe, '&amp;').replace(ltRe, '&lt;')
        .replace(gtRe, '&gt;').replace(quotRe, '&#34;');
  }

  /**
   * Escape entities in RCDATA that can be escaped without changing the meaning.
   * {\@updoc
   * $ normalizeRCData('1 < 2 &&amp; 3 > 4 &amp;& 5 &lt; 7&8')
   * # '1 &lt; 2 &amp;&amp; 3 &gt; 4 &amp;&amp; 5 &lt; 7&amp;8'
   * }
   */
  function normalizeRCData(rcdata) {
    return rcdata
        .replace(looseAmpRe, '&amp;$1')
        .replace(ltRe, '&lt;')
        .replace(gtRe, '&gt;');
  }


  // TODO(mikesamuel): validate sanitizer regexs against the HTML5 grammar at
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html

  /** token definitions. */
  var INSIDE_TAG_TOKEN = new RegExp(
      // Don't capture space.
      '^\\s*(?:' + (
        // Capture an attribute name in group 1, and value in group 3.
        // We capture the fact that there was an attribute in group 2, since
        // interpreters are inconsistent in whether a group that matches nothing
        // is null, undefined, or the empty string.
        '(?:' +
        '([a-z][a-z-]*)' + (                  // attribute name
          '(' +                                // optionally followed
          '\\s*=\\s*' + (
            '(' +
            // A double quoted string.
            '\"[^\"]*\"' +
            // A single quoted string.
            '|\'[^\']*\'' +
            // The positive lookahead is used to make sure that in
            // <foo bar= baz=boo>, the value for bar is blank, not "baz=boo".
            '|(?=[a-z][a-z-]*\\s*=)' +
            // An unquoted value that is not an attribute name.
            // We know it is not an attribute name because the previous
            // zero-width match would've eliminated that possibility.
            '|[^>\"\'\\s]*' +
            ')'
          ) +
          ')'
        ) + '?' +
        ')'
      ) +
      // End of tag captured in group 3.
      '|(/?>)' +
      // Don't capture cruft
      '|[\\s\\S][^a-z\\s>]*)',
      'i');

  var OUTSIDE_TAG_TOKEN = new RegExp(
      '^(?:' +
      // Entity captured in group 1.
      '&(\\#[0-9]+|\\#[x][0-9a-f]+|\\w+);' +
      // Comment, doctypes, and processing instructions not captured.
      '|<\!--[\\s\\S]*?--\>|<!\\w[^>]*>|<\\?[^>*]*>' +
      // '/' captured in group 2 for close tags, and name captured in group 3.
      '|<(/)?([a-z][a-z0-9]*)' +
      // Text captured in group 4.
      '|([^<&>]+)' +
      // Cruft captured in group 5.
      '|([<&>]))',
      'i');

  /**
   * Given a SAX-like event handler, produce a function that feeds those
   * events and a parameter to the event handler.
   *
   * The event handler has the form:{@code
   * {
   *   // Name is an upper-case HTML tag name.  Attribs is an array of
   *   // alternating upper-case attribute names, and attribute values.  The
   *   // attribs array is reused by the parser.  Param is the value passed to
   *   // the saxParser.
   *   startTag: function (name, attribs, param) { ... },
   *   endTag:   function (name, param) { ... },
   *   pcdata:   function (text, param) { ... },
   *   rcdata:   function (text, param) { ... },
   *   cdata:    function (text, param) { ... },
   *   startDoc: function (param) { ... },
   *   endDoc:   function (param) { ... }
   * }}
   *
   * @param {Object} handler a record containing event handlers.
   * @return {function(string, Object)} A function that takes a chunk of HTML
   *     and a parameter.  The parameter is passed on to the handler methods.
   */
  function makeSaxParser(handler) {
    return function parse(htmlText, param) {
      htmlText = String(htmlText);
      var htmlLower = null;

      var inTag = false;  // True iff we're currently processing a tag.
      var attribs = [];  // Accumulates attribute names and values.
      var tagName = void 0;  // The name of the tag currently being processed.
      var eflags = void 0;  // The element flags for the current tag.
      var openTag = void 0;  // True if the current tag is an open tag.

      if (handler.startDoc) { handler.startDoc(param); }

      while (htmlText) {
        var m = htmlText.match(inTag ? INSIDE_TAG_TOKEN : OUTSIDE_TAG_TOKEN);
        htmlText = htmlText.substring(m[0].length);

        if (inTag) {
          if (m[1]) { // attribute
            // setAttribute with uppercase names doesn't work on IE6.
            var attribName = lcase(m[1]);
            var decodedValue;
            if (m[2]) {
              var encodedValue = m[3];
              switch (encodedValue.charCodeAt(0)) {  // Strip quotes
                case 34: case 39:
                  encodedValue = encodedValue.substring(
                      1, encodedValue.length - 1);
                  break;
              }
              decodedValue = unescapeEntities(stripNULs(encodedValue));
            } else {
              // Use empty string as value for valueless attribs
              decodedValue = "";
            }
            attribs.push(attribName, decodedValue);
          } else if (m[4]) {
            if (eflags !== void 0) {  // False if not in whitelist.
              if (openTag) {
                if (handler.startTag) {
                  handler.startTag(tagName, attribs, param);
                }
              } else {
                if (handler.endTag) {
                  handler.endTag(tagName, param);
                }
              }
            }

            if (openTag &&
                (eflags & (html4.eflags.CDATA | html4.eflags.RCDATA))) {
              if (htmlLower === null) {
                htmlLower = lcase(htmlText);
              } else {
                htmlLower = htmlLower.substring(
                    htmlLower.length - htmlText.length);
              }
              var dataEnd = htmlLower.indexOf('</' + tagName);
              if (dataEnd < 0) { dataEnd = htmlText.length; }
              if (dataEnd) {
                if (eflags & html4.eflags.CDATA) {
                  if (handler.cdata) {
                    handler.cdata(htmlText.substring(0, dataEnd), param);
                  }
                } else if (handler.rcdata) {
                  handler.rcdata(
                      normalizeRCData(htmlText.substring(0, dataEnd)), param);
                }
                htmlText = htmlText.substring(dataEnd);
              }
            }

            tagName = eflags = openTag = void 0;
            attribs.length = 0;
            inTag = false;
          }
        } else {
          if (m[1]) {  // Entity
            if (handler.pcdata) { handler.pcdata(m[0], param); }
          } else if (m[3]) {  // Tag
            openTag = !m[2];
            inTag = true;
            tagName = lcase(m[3]);
            eflags = html4.ELEMENTS.hasOwnProperty(tagName) ?
                html4.ELEMENTS[tagName] : void 0;
          } else if (m[4]) {  // Text
            if (handler.pcdata) { handler.pcdata(m[4], param); }
          } else if (m[5]) {  // Cruft
            if (handler.pcdata) {
              switch (m[5]) {
                case '<': handler.pcdata('&lt;', param); break;
                case '>': handler.pcdata('&gt;', param); break;
                case '&': handler.pcdata('&amp;', param); break;
              }
            }
          }
        }
      }

      if (handler.endDoc) { handler.endDoc(param); }
    };
  }

  /**
   * Returns a function that strips unsafe tags and attributes from html.
   * @param {function(string, Array.<string>): ?Array.<string>} tagPolicy
   *     A function that takes (tagName, attribs[]), where tagName is a key in
   *     html4.ELEMENTS and attribs is an array of alternating attribute names
   *     and values.  It should return a sanitized attribute array, or null to
   *     delete the tag.  It's okay for tagPolicy to modify the attribs array,
   *     but the same array is reused, so it should not be held between calls.
   * @return {function(string, Array)} A function that sanitizes a string of
   *     HTML and appends result strings to the second argument, an array.
   */
  function makeHtmlSanitizer(tagPolicy) {
    var stack;
    var ignoring;
    return makeSaxParser({
      startDoc: function(_) {
        stack = [];
        ignoring = false;
      },
      startTag: function(tagName, attribs, out) {
        if (ignoring) { return; }
        if (!html4.ELEMENTS.hasOwnProperty(tagName)) { return; }
        var eflags = html4.ELEMENTS[tagName];
        if (eflags & html4.eflags.FOLDABLE) {
          return;
        }
        attribs = tagPolicy(tagName, attribs);
        if (!attribs) {
          ignoring = !(eflags & html4.eflags.EMPTY);
          return;
        }
        // TODO(mikesamuel): relying on tagPolicy not to insert unsafe
        // attribute names.
        if (!(eflags & html4.eflags.EMPTY)) {
          stack.push(tagName);
        }

        out.push('<', tagName);
        for (var i = 0, n = attribs.length; i < n; i += 2) {
          var attribName = attribs[i],
              value = attribs[i + 1];
          if (value !== null && value !== void 0) {
            out.push(' ', attribName, '="', escapeAttrib(value), '"');
          }
        }
        out.push('>');
      },
      endTag: function(tagName, out) {
        if (ignoring) {
          ignoring = false;
          return;
        }
        if (!html4.ELEMENTS.hasOwnProperty(tagName)) { return; }
        var eflags = html4.ELEMENTS[tagName];
        if (!(eflags & (html4.eflags.EMPTY | html4.eflags.FOLDABLE))) {
          var index;
          if (eflags & html4.eflags.OPTIONAL_ENDTAG) {
            for (index = stack.length; --index >= 0;) {
              var stackEl = stack[index];
              if (stackEl === tagName) { break; }
              if (!(html4.ELEMENTS[stackEl] &
                    html4.eflags.OPTIONAL_ENDTAG)) {
                // Don't pop non optional end tags looking for a match.
                return;
              }
            }
          } else {
            for (index = stack.length; --index >= 0;) {
              if (stack[index] === tagName) { break; }
            }
          }
          if (index < 0) { return; }  // Not opened.
          for (var i = stack.length; --i > index;) {
            var stackEl = stack[i];
            if (!(html4.ELEMENTS[stackEl] &
                  html4.eflags.OPTIONAL_ENDTAG)) {
              out.push('</', stackEl, '>');
            }
          }
          stack.length = index;
          out.push('</', tagName, '>');
        }
      },
      pcdata: function(text, out) {
        if (!ignoring) { out.push(text); }
      },
      rcdata: function(text, out) {
        if (!ignoring) { out.push(text); }
      },
      cdata: function(text, out) {
        if (!ignoring) { out.push(text); }
      },
      endDoc: function(out) {
        for (var i = stack.length; --i >= 0;) {
          out.push('</', stack[i], '>');
        }
        stack.length = 0;
      }
    });
  }

  // From RFC3986
  var URI_SCHEME_RE = new RegExp(
      '^' +
      '(?:' +
        '([^:\/?#]+)' +         // scheme
      ':)?'
  );

  /**
   * Sanitizes attributes on an HTML tag.
   * @param {string} tagName An HTML tag name in lowercase.
   * @param {Array.<?string>} attribs An array of alternating names and values.
   * @param {?function(?string): ?string} opt_uriPolicy A transform to apply to
   *     URI attributes; it can return a new string value, or null to delete
   *     the attribute.  If unspecified, URI attributes are deleted.
   * @param {function(?string): ?string} opt_nmTokenPolicy A transform to apply
   *     to attributes containing HTML names, element IDs, and space-separated
   *     lists of classes; it can return a new string value, or null to delete
   *     the attribute.  If unspecified, these attributes are kept unchanged.
   * @return {Array.<?string>} The sanitized attributes as a list of alternating
   *     names and values, where a null value means to omit the attribute.
   */
  function sanitizeAttribs(tagName, attribs, opt_uriPolicy, opt_nmTokenPolicy) {
    for (var i = 0; i < attribs.length; i += 2) {
      var attribName = attribs[i];
      var value = attribs[i + 1];
      var atype = null, attribKey;
      if ((attribKey = tagName + '::' + attribName,
           html4.ATTRIBS.hasOwnProperty(attribKey)) ||
          (attribKey = '*::' + attribName,
           html4.ATTRIBS.hasOwnProperty(attribKey))) {
        atype = html4.ATTRIBS[attribKey];
      }
      if (atype !== null) {
        switch (atype) {
          case html4.atype.NONE: break;
          case html4.atype.SCRIPT:
          case html4.atype.STYLE:
            value = null;
            break;
          case html4.atype.ID:
          case html4.atype.IDREF:
          case html4.atype.IDREFS:
          case html4.atype.GLOBAL_NAME:
          case html4.atype.LOCAL_NAME:
          case html4.atype.CLASSES:
            value = opt_nmTokenPolicy ? opt_nmTokenPolicy(value) : value;
            break;
          case html4.atype.URI:
            var parsedUri = ('' + value).match(URI_SCHEME_RE);
            if (!parsedUri) {
              value = null;
            } else if (!parsedUri[1] ||
                WHITELISTED_SCHEMES.test(parsedUri[1])) {
              value = opt_uriPolicy ? opt_uriPolicy(value) : null;
            } else {
              value = null;
            }
            break;
          case html4.atype.URI_FRAGMENT:
            if (value && '#' === value.charAt(0)) {
              value = value.substring(1);  // remove the leading '#'
              value = opt_nmTokenPolicy ? opt_nmTokenPolicy(value) : value;
              if (value !== null && value !== void 0) {
                value = '#' + value;  // restore the leading '#'
              }
            } else {
              value = null;
            }
            break;
          default:
            value = null;
            break;
        }
      } else {
        value = null;
      }
      attribs[i + 1] = value;
    }
    return attribs;
  }

  /**
   * Creates a tag policy that omits all tags marked UNSAFE in html4-defs.js
   * and applies the default attribute sanitizer with the supplied policy for
   * URI attributes and NMTOKEN attributes.
   * @param {?function(?string): ?string} opt_uriPolicy A transform to apply to
   *     URI attributes.  If not given, URI attributes are deleted.
   * @param {function(?string): ?string} opt_nmTokenPolicy A transform to apply
   *     to attributes containing HTML names, element IDs, and space-separated
   *     lists of classes.  If not given, such attributes are left unchanged.
   * @return {function(string, Array.<?string>)} A tagPolicy suitable for
   *     passing to html.sanitize.
   */
  function makeTagPolicy(opt_uriPolicy, opt_nmTokenPolicy) {
    return function(tagName, attribs) {
      if (!(html4.ELEMENTS[tagName] & html4.eflags.UNSAFE)) {
        return sanitizeAttribs(
            tagName, attribs, opt_uriPolicy, opt_nmTokenPolicy);
      }
    };
  }

  /**
   * Sanitizes HTML tags and attributes according to a given policy.
   * @param {string} inputHtml The HTML to sanitize.
   * @param {function(string, Array.<?string>)} tagPolicy A function that
   *     decides which tags to accept and sanitizes their attributes (see
   *     makeHtmlSanitizer above for details).
   * @return {string} The sanitized HTML.
   */
  function sanitizeWithPolicy(inputHtml, tagPolicy) {
    var outputArray = [];
    makeHtmlSanitizer(tagPolicy)(inputHtml, outputArray);
    return outputArray.join('');
  }

  /**
   * Strips unsafe tags and attributes from HTML.
   * @param {string} inputHtml The HTML to sanitize.
   * @param {?function(?string): ?string} opt_uriPolicy A transform to apply to
   *     URI attributes.  If not given, URI attributes are deleted.
   * @param {function(?string): ?string} opt_nmTokenPolicy A transform to apply
   *     to attributes containing HTML names, element IDs, and space-separated
   *     lists of classes.  If not given, such attributes are left unchanged.
   */
  function sanitize(inputHtml, opt_uriPolicy, opt_nmTokenPolicy) {
    var tagPolicy = makeTagPolicy(opt_uriPolicy, opt_nmTokenPolicy);
    return sanitizeWithPolicy(inputHtml, tagPolicy);
  }

  return {
    escapeAttrib: escapeAttrib,
    makeHtmlSanitizer: makeHtmlSanitizer,
    makeSaxParser: makeSaxParser,
    makeTagPolicy: makeTagPolicy,
    normalizeRCData: normalizeRCData,
    sanitize: sanitize,
    sanitizeAttribs: sanitizeAttribs,
    sanitizeWithPolicy: sanitizeWithPolicy,
    unescapeEntities: unescapeEntities,
    isLegacy: true
  };
})(html4);

var html_sanitize = html.sanitize;

// Exports for closure compiler.  Note this file is also cajoled
// for domado and run in an environment without 'window'
if (typeof window !== 'undefined') {
  window['html'] = html;
  window['html_sanitize'] = html_sanitize;
}
