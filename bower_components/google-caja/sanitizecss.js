// Copyright (C) 2011 Google Inc.
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
 * JavaScript support for client-side CSS sanitization.
 * The CSS property schema API is defined in CssPropertyPatterns.java which
 * is used to generate css-defs.js.
 *
 * @author mikesamuel@gmail.com
 * \@requires CSS_PROP_BIT_GLOBAL_NAME
 * \@requires CSS_PROP_BIT_HASH_VALUE
 * \@requires CSS_PROP_BIT_NEGATIVE_QUANTITY
 * \@requires CSS_PROP_BIT_PROPERTY_NAME
 * \@requires CSS_PROP_BIT_QUANTITY
 * \@requires CSS_PROP_BIT_QSTRING
 * \@requires CSS_PROP_BIT_UNRESERVED_WORD
 * \@requires CSS_PROP_BIT_URL
 * \@requires cssSchema
 * \@requires decodeCss
 * \@requires html4
 * \@requires URI
 * \@overrides window
 * \@requires parseCssStylesheet
 * \@provides sanitizeCssProperty
 * \@provides sanitizeCssSelectorList
 * \@provides sanitizeStylesheet
 * \@provides sanitizeStylesheetWithExternals
 * \@provides sanitizeMediaQuery
 */

var sanitizeCssProperty = undefined;
var sanitizeCssSelectorList = undefined;
var sanitizeStylesheet = undefined;
var sanitizeStylesheetWithExternals = undefined;
var sanitizeMediaQuery = undefined;

(function () {
  var NOEFFECT_URL = 'url("about:blank")';
  /**
   * The set of characters that need to be normalized inside url("...").
   * We normalize newlines because they are not allowed inside quoted strings,
   * normalize quote characters, angle-brackets, and asterisks because they
   * could be used to break out of the URL or introduce targets for CSS
   * error recovery.  We normalize parentheses since they delimit unquoted
   * URLs and calls and could be a target for error recovery.
   */
  var NORM_URL_REGEXP = /[\n\f\r\"\'()*<>]/g;
  /** The replacements for NORM_URL_REGEXP. */
  var NORM_URL_REPLACEMENTS = {
    '\n': '%0a',
    '\f': '%0c',
    '\r': '%0d',
    '"':  '%22',
    '\'': '%27',
    '(':  '%28',
    ')':  '%29',
    '*':  '%2a',
    '<':  '%3c',
    '>':  '%3e'
  };

  function normalizeUrl(s) {
    if ('string' === typeof s) {
      return 'url("' + s.replace(NORM_URL_REGEXP, normalizeUrlChar) + '")';
    } else {
      return NOEFFECT_URL;
    }
  }
  function normalizeUrlChar(ch) {
    return NORM_URL_REPLACEMENTS[ch];
  }

  // From RFC3986
  var URI_SCHEME_RE = new RegExp(
      '^' +
      '(?:' +
        '([^:\/?# ]+)' +         // scheme
      ':)?'
  );

  var ALLOWED_URI_SCHEMES = /^(?:https?|mailto)$/i;

  function resolveUri(baseUri, uri) {
    if (baseUri) {
      return URI.utils.resolve(baseUri, uri);
    }
    return uri;
  }

  function safeUri(uri, prop, naiveUriRewriter) {
    if (!naiveUriRewriter) { return null; }
    var parsed = ('' + uri).match(URI_SCHEME_RE);
    if (parsed && (!parsed[1] || ALLOWED_URI_SCHEMES.test(parsed[1]))) {
      return naiveUriRewriter(uri, prop);
    } else {
      return null;
    }
  }

  function withoutVendorPrefix(ident) {
    // http://stackoverflow.com/a/5411098/20394 has a fairly extensive list
    // of vendor prefices.
    // Blink has not declared a vendor prefix distinct from -webkit-
    // and http://css-tricks.com/tldr-on-vendor-prefix-drama/ discusses
    // how Mozilla recognizes some -webkit-
    // http://wiki.csswg.org/spec/vendor-prefixes talks more about
    // cross-implementation, and lists other prefixes.
    // Note: info is duplicated in CssValidator.java
    return ident.replace(
        /^-(?:apple|css|epub|khtml|moz|mso?|o|rim|wap|webkit|xv)-(?=[a-z])/, '');
  }

  /**
   * Given a series of normalized CSS tokens, applies a property schema, as
   * defined in CssPropertyPatterns.java, and sanitizes the tokens in place.
   * @param property a property name.
   * @param tokens as parsed by lexCss.  Modified in place.
   * @param opt_naiveUriRewriter a URI rewriter; an object with a "rewrite"
   *     function that takes a URL and returns a safe URL.
   * @param opt_baseURI a URI against which all relative URLs in tokens will
   *     be resolved.
   * @param opt_idSuffix {string} appended to all IDs to scope them.
   */
  sanitizeCssProperty = (function () {

    function unionArrays(arrs) {
      var map = {};
      for (var i = arrs.length; --i >= 0;) {
        var arr = arrs[i];
        for (var j = arr.length; --j >= 0;) {
          map[arr[j]] = ALLOWED_LITERAL;
        }
      }
      return map;
    }

    // Used as map value to avoid hasOwnProperty checks.
    var ALLOWED_LITERAL = {};

    return function sanitize(
        property, tokens, opt_naiveUriRewriter, opt_baseUri, opt_idSuffix) {

      var propertyKey = withoutVendorPrefix(property);
      var propertySchema = cssSchema[propertyKey];

      // If the property isn't recognized, elide all tokens.
      if (!propertySchema || 'object' !== typeof propertySchema) {
        tokens.length = 0;
        return;
      }

      var propBits = propertySchema['cssPropBits'];

      /**
       * Recurse to apply the appropriate function schema to the function call
       * that starts at {@code tokens[start]}.
       * @param {Array.<string>} tokens an array of CSS token that is modified
       *   in place so that all tokens involved in the function call
       *   (from {@code tokens[start]} to a close parenthesis) are folded to
       *   one token.
       * @param {number} start an index into tokens of a function token like
       *   {@code 'name('}.
       * @return the replacement function or the empty string if the function
       *   call is not both well-formed and allowed.
       */
      function sanitizeFunctionCall(tokens, start) {
        var parenDepth = 1, end = start + 1, n = tokens.length;
        while (end < n && parenDepth) {
          var token = tokens[end++];
          // Decrement if we see a close parenthesis, and increment if we
          // see a function.  Since url(...) are whole tokens, they will not
          // affect the token scanning.
          parenDepth += (token === ')' ? -1 : /^[^"']*\($/.test(token));
        }
        // Allow error-recovery from unclosed functions by ignoring the call and
        // so allowing resumption at the next ';'.
        if (!parenDepth) {
          var fnToken = tokens[start].toLowerCase();
          var bareFnToken = withoutVendorPrefix(fnToken);
          // Cut out the originals, so the caller can step by one token.
          var fnTokens = tokens.splice(start, end - start, '');
          var fns = propertySchema['cssFns'];
          // Look for a function that matches the name.
          for (var i = 0, nFns = fns.length; i < nFns; ++i) {
            if (fns[i].substring(0, bareFnToken.length) == bareFnToken) {
              fnTokens[0] = fnTokens[fnTokens.length - 1] = '';
              // Recurse and sanitize the function parameters.
              sanitize(
                fns[i],
                // The actual parameters to the function.
                fnTokens,
                opt_naiveUriRewriter, opt_baseUri);
              // Reconstitute the function from its parameter tokens.
              return fnToken + fnTokens.join(' ') + ')';
            }
          }
        }
        return '';
      }

      // Used to determine whether to treat quoted strings as URLs or
      // plain text content, and whether unrecognized keywords can be quoted
      // to treat ['Arial', 'Black'] equivalently to ['"Arial Black"'].
      var stringDisposition =
        propBits & (CSS_PROP_BIT_URL | CSS_PROP_BIT_UNRESERVED_WORD);
      // Used to determine what to do with unreserved words.
      var identDisposition =
        propBits & (CSS_PROP_BIT_GLOBAL_NAME | CSS_PROP_BIT_PROPERTY_NAME);

      // Used to join unquoted keywords into a single quoted string.
      var lastQuoted = NaN;
      var i = 0, k = 0;
      for (;i < tokens.length; ++i) {
        // Has the effect of normalizing hex digits, keywords,
        // and function names.
        var token = tokens[i].toLowerCase();
        var cc = token.charCodeAt(0), cc1, cc2, isnum1, isnum2, end;
        var litGroup, litMap;
        token = (

          // Strip out spaces.  Normally cssparser.js dumps these, but we
          // strip them out in case the content doesn't come via cssparser.js.
          (cc === ' '.charCodeAt(0)) ? ''
          : (cc === '"'.charCodeAt(0)) ? (  // Quoted string.
            (stringDisposition === CSS_PROP_BIT_URL)
            ? (opt_naiveUriRewriter
               // Sanitize and convert to url("...") syntax.
               // Treat url content as case-sensitive.
               ? (normalizeUrl(
                   // Rewrite to a safe URI.
                   safeUri(
                     // Convert to absolute URL
                     resolveUri(
                       opt_baseUri,
                       // Strip off quotes
                       decodeCss(tokens[i].substring(1, token.length - 1))),
                     propertyKey,
                     opt_naiveUriRewriter)))
              : '')
            : ((propBits & CSS_PROP_BIT_QSTRING)
               // Ambiguous when more than one bit set in disposition.
               && !(stringDisposition & (stringDisposition - 1)))
            ? token
            // Drop if quoted strings not allowed.
            : ''
          )

          // inherit is always allowed.
          : token === 'inherit'
          ? token

          : (
            litGroup = propertySchema['cssLitGroup'],
            litMap = (litGroup
                      ? (propertySchema['cssLitMap']
                         // Lazily compute the union from litGroup.
                         || (propertySchema['cssLitMap'] =
                             unionArrays(litGroup)))
                      : ALLOWED_LITERAL),  // A convenient empty object.
            (litMap[withoutVendorPrefix(token)] === ALLOWED_LITERAL)
          )
          // Token is in the literal map or matches extra.
          ? token

          // Preserve hash color literals if allowed.
          : (cc === '#'.charCodeAt(0) && /^#(?:[0-9a-f]{3}){1,2}$/.test(token))
          ? (propBits & CSS_PROP_BIT_HASH_VALUE ? token : '')

          : ('0'.charCodeAt(0) <= cc && cc <= '9'.charCodeAt(0))
          // A number starting with a digit.
          ? ((propBits & CSS_PROP_BIT_QUANTITY) ? token : '')

          // Normalize quantities so they don't start with a '.' or '+' sign and
          // make sure they all have an integer component so can't be confused
          // with a dotted identifier.
          // This can't be done in the lexer since ".4" is a valid rule part.
          : (cc1 = token.charCodeAt(1),
             cc2 = token.charCodeAt(2),
             isnum1 = '0'.charCodeAt(0) <= cc1 && cc1 <= '9'.charCodeAt(0),
             isnum2 = '0'.charCodeAt(0) <= cc2 && cc2 <= '9'.charCodeAt(0),
             // +.5 -> 0.5 if allowed.
             (cc === '+'.charCodeAt(0)
              && (isnum1 || (cc1 === '.'.charCodeAt(0) && isnum2))))
          ? ((propBits & CSS_PROP_BIT_QUANTITY)
            ? ((isnum1 ? '' : '0') + token.substring(1))
            : '')

          // -.5 -> -0.5 if allowed otherwise -> 0 if quantities allowed.
          : (cc === '-'.charCodeAt(0)
             && (isnum1 || (cc1 === '.'.charCodeAt(0) && isnum2)))
            ? ((propBits & CSS_PROP_BIT_NEGATIVE_QUANTITY)
               ? ((isnum1 ? '-' : '-0') + token.substring(1))
               : ((propBits & CSS_PROP_BIT_QUANTITY) ? '0' : ''))

          // .5 -> 0.5 if allowed.
          : (cc === '.'.charCodeAt(0) && isnum1)
          ? ((propBits & CSS_PROP_BIT_QUANTITY) ? '0' + token : '')

          // Handle url("...") by rewriting the body.
          : ('url("' === token.substring(0, 5))
          ? ((opt_naiveUriRewriter && (propBits & CSS_PROP_BIT_URL))
             ? normalizeUrl(safeUri(resolveUri(opt_baseUri,
                  tokens[i].substring(5, token.length - 2)),
                  propertyKey,
                  opt_naiveUriRewriter))
             : '')

          // Handle func(...) by recursing.
          // Functions start at a token like "name(" and end with a ")" taking
          // into account nesting.
          : (token.charAt(token.length-1) === '(')
          ? sanitizeFunctionCall(tokens, i)

          : (identDisposition
             && /^-?[a-z_][\w\-]*$/.test(token) && !/__$/.test(token))
          ? (opt_idSuffix && identDisposition === CSS_PROP_BIT_GLOBAL_NAME
             ? tokens[i] + opt_idSuffix  // use original token, not lowercased
             : (identDisposition === CSS_PROP_BIT_PROPERTY_NAME
                && cssSchema[token]
                && 'number' === typeof cssSchema[token].cssPropBits)
             ? token
             : '')

          : (/^\w+$/.test(token)
             && stringDisposition === CSS_PROP_BIT_UNRESERVED_WORD
             && (propBits & CSS_PROP_BIT_QSTRING))
          // Quote unrecognized keywords so font names like
          //    Arial Bold
          // ->
          //    "Arial Bold"
          ? (lastQuoted+1 === k
             // If the last token was also a keyword that was quoted, then
             // combine this token into that.
             ? (tokens[lastQuoted] = (
                  tokens[lastQuoted].substring(0, tokens[lastQuoted].length-1)
                  + ' ' + token + '"'),
                token = '')
             : (lastQuoted = k, '"' + token + '"'))

          // Disallowed.
          : '');
        if (token) {
          tokens[k++] = token;
        }
      }
      // For single URL properties, if the URL failed to pass the sanitizer,
      // then just drop it.
      if (k === 1 && tokens[0] === NOEFFECT_URL) { k = 0; }
      tokens.length = k;
    };
  })();

  // Note, duplicated in CssRewriter.java
  // Constructed from
  //    https://developer.mozilla.org/en-US/docs/Web/CSS/Reference
  //    https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  //    http://dev.w3.org/csswg/selectors4/
  var PSEUDO_SELECTOR_WHITELIST =
    new RegExp(
        '^(active|after|before|blank|checked|default|disabled'
        + '|drop|empty|enabled|first|first-child|first-letter'
        + '|first-line|first-of-type|fullscreen|focus|hover'
        + '|in-range|indeterminate|invalid|last-child|last-of-type'
        + '|left|link|only-child|only-of-type|optional|out-of-range'
        + '|placeholder-shown|read-only|read-write|required|right'
        + '|root|scope|user-error|valid|visited'
        + ')$');

  // Set of punctuation tokens that are child/sibling selectors.
  var COMBINATOR = {};
  COMBINATOR['>'] = COMBINATOR['+'] = COMBINATOR['~'] = COMBINATOR;

  /**
   * Given a series of tokens, returns a list of sanitized selectors.
   * @param {Array.<string>} selectors In the form produced by csslexer.js.
   * @param {{
   *     containerClass: ?string,
   *     idSuffix: string,
   *     tagPolicy: function(string, Array.<string>): ?Array.<string>,
   *     virtualizeAttrName: ?function(string, string): ?string
   *   }} virtualization An object like <pre<{
   *   containerClass: class name prepended to all selectors to scope them (if
   *       not null)
   *   idSuffix: appended to all IDs to scope them
   *   tagPolicy: As in html-sanitizer, used for rewriting element names.
   *   virtualizeAttrName: Rewrite a single attribute name for attribute
   *       selectors, or return null if not possible. Should be consistent
   *       with tagPolicy if possible.
   * }</pre>
   *    If containerClass is {@code "sfx"} and idSuffix is {@code "-sfx"}, the
   *    selector
   *    {@code ["a", "#foo", " ", "b", ".bar"]} will be namespaced to
   *    {@code [".sfx", " ", "a", "#foo-sfx", " ", "b", ".bar"]}.
   * @param {function(Array.<string>): boolean} opt_onUntranslatableSelector
   *     When a selector cannot be translated, this function is called with the
   *     non-whitespace/comment tokens comprising the selector and returns a
   *     value indicating whether to continue processing the selector list.
   *     If it returns falsey, then processing is aborted and null is returned.
   *     If not present or it returns truthy, then the complex selector is
   *     dropped from the selector list.
   * @return {Array.<string>}? an array of sanitized selectors.
   *    Null when the untraslatable compound selector handler aborts processing.
   */
  sanitizeCssSelectorList = function(
      selectors, virtualization, opt_onUntranslatableSelector) {
    var containerClass = virtualization.containerClass;
    var idSuffix = virtualization.idSuffix;
    var tagPolicy = virtualization.tagPolicy;
    var sanitized = [];

    // Remove any spaces that are not operators.
    var k = 0, i, inBrackets = 0, tok;
    for (i = 0; i < selectors.length; ++i) {
      tok = selectors[i];

      if (
            (tok == '(' || tok == '[') ? (++inBrackets, true)
          : (tok == ')' || tok == ']') ? (inBrackets && --inBrackets, true)
          : !(selectors[i] == ' '
              && (inBrackets || COMBINATOR[selectors[i-1]] === COMBINATOR
                  || COMBINATOR[selectors[i+1]] === COMBINATOR))
        ) {
        selectors[k++] = selectors[i];
      }
    }
    selectors.length = k;

    // Split around commas.  If there is an error in one of the comma separated
    // bits, we throw the whole away, but the failure of one selector does not
    // affect others except that opt_onUntranslatableSelector allows one to
    // treat the entire output as unusable.
    var n = selectors.length, start = 0;
    for (i = 0; i < n; ++i) {
      if (selectors[i] === ',') {  // TODO: ignore ',' inside brackets.
        if (!processComplexSelector(start, i)) { return null; }
        start = i+1;
      }
    }
    if (!processComplexSelector(start, n)) { return null; }


    function processComplexSelector(start, end) {
      // Space around commas is not an operator.
      if (selectors[start] === ' ') { ++start; }
      if (end-1 !== start && selectors[end] === ' ') { --end; }

      // Split the selector into element selectors, content around
      // space (ancestor operator) and '>' (descendant operator).
      var out = [];
      var lastOperator = start;
      var valid = true;  // True iff out contains a valid complex selector.
      for (var i = start; valid && i < end; ++i) {
        var tok = selectors[i];
        if (COMBINATOR[tok] === COMBINATOR || tok === ' ') {
          // We've found the end of a single link in the selector chain.
          if (!processCompoundSelector(lastOperator, i, tok)) {
            valid = false;
          } else {
            lastOperator = i+1;
          }
        }
      }
      if (!processCompoundSelector(lastOperator, end, '')) {
        valid = false;
      }

      function processCompoundSelector(start, end, combinator) {
        // Split the element selector into four parts.
        // DIV.foo#bar[href]:hover
        //    ^       ^     ^
        // el classes attrs pseudo
        var element, classId, attrs, pseudoSelector,
            tok,  // The current token
            // valid implies the parts above comprise a sanitized selector.
            valid = true;
        element = '';
        if (start < end) {
          tok = selectors[start];
          if (tok === '*') {
            ++start;
            element = tok;
          } else if (/^[a-zA-Z]/.test(tok)) {  // is an element selector
            var decision = tagPolicy(tok.toLowerCase(), []);
            if (decision) {
              if ('tagName' in decision) {
                tok = decision['tagName'];
              }
              ++start;
              element = tok;
            }
          }
        }
        classId = '';
        attrs = '';
        pseudoSelector = '';
        for (;valid && start < end; ++start) {
          tok = selectors[start];
          if (tok.charAt(0) === '#') {
            if (/^#_|__$|[^\w#:\-]/.test(tok)) {
              valid = false;
            } else {
              // Rewrite ID elements to include the suffix.
              classId += tok + idSuffix;
            }
          } else if (tok === '.') {
            if (++start < end
                && /^[0-9A-Za-z:_\-]+$/.test(tok = selectors[start])
                && !/^_|__$/.test(tok)) {
              classId += '.' + tok;
            } else {
              valid = false;
            }
          } else if (start + 1 < end && selectors[start] === '[') {
            ++start;
            var vAttr = selectors[start++].toLowerCase();
            // Schema lookup for type information
            var atype = html4.ATTRIBS[element + '::' + vAttr];
            if (atype !== +atype) { atype = html4.ATTRIBS['*::' + vAttr]; }

            var rAttr;
            // Consult policy
            // TODO(kpreid): Making this optional is a kludge to avoid changing
            // the public interface until we have a more well-structured design.
            if (virtualization.virtualizeAttrName) {
              rAttr = virtualization.virtualizeAttrName(element, vAttr);
              if (typeof rAttr !== 'string') {
                // rejected
                valid = false;
                rAttr = vAttr;
              }
              // don't reject even if not in schema
              if (valid && atype !== +atype) {
                atype = html4.atype['NONE'];
              }
            } else {
              rAttr = vAttr;
              if (atype !== +atype) {  // not permitted according to schema
                valid = false;
              }
            }

            var op = '', value = '', ignoreCase = false;
            if (/^[~^$*|]?=$/.test(selectors[start])) {
              op = selectors[start++];
              value = selectors[start++];
              // Quote identifier values.
              if (/^[0-9A-Za-z:_\-]+$/.test(value)) {
                value = '"' + value + '"';
              } else if (value === ']') {
                value = '""';
                --start;
              }
              // Reject unquoted values.
              if (!/^"([^\"\\]|\\.)*"$/.test(value)) {
                valid = false;
              }
              ignoreCase = selectors[start] === "i";
              if (ignoreCase) { ++start; }
            }
            if (selectors[start] !== ']') {
              ++start;
              valid = false;
            }
            // TODO: replace this with a lookup table that also provides a
            // function from operator and value to testable value.
            switch (atype) {
            case html4.atype['CLASSES']:
            case html4.atype['LOCAL_NAME']:
            case html4.atype['NONE']:
              break;
            case html4.atype['GLOBAL_NAME']:
            case html4.atype['ID']:
            case html4.atype['IDREF']:
              if ((op === '=' || op === '~=' || op === '$=')
                  && value != '""' && !ignoreCase) {
                // The suffix is case-sensitive, so we can't translate case
                // ignoring matches.
                value = '"'
                  + value.substring(1, value.length-1) + idSuffix
                  + '"';
              } else if (op === '|=' || op === '') {
                // Ok.  a|=b -> a == b || a.startsWith(b + "-") and since we
                // use "-" to separate the suffix from the identifier, we can
                // allow this through unmodified.
                // Existence checks are also ok.
              } else {
                // Can't correctly handle prefix and substring operators
                // without leaking information about the suffix.
                valid = false;
              }
              break;
            case html4.atype['URI']:
            case html4.atype['URI_FRAGMENT']:
              // URIs are rewritten, so we can't meanginfully translate URI
              // selectors besides the common a[href] one that is used to
              // distinguish links from naming anchors.
              if (op !== '') { valid = false; }
              break;
            // TODO: IDREFS
            default:
              valid = false;
            }
            if (valid) {
              attrs += '[' + rAttr.replace(/[^\w-]/g, '\\$&') + op + value +
                  (ignoreCase ? ' i]' : ']');
            }
          } else if (start < end && selectors[start] === ':') {
            tok = selectors[++start];
            if (PSEUDO_SELECTOR_WHITELIST.test(tok)) {
              pseudoSelector += ':' + tok;
            } else {
              break;
            }
          } else {
            break;  // Unrecognized token.
          }
        }
        if (start !== end) {  // Tokens not consumed.
          valid = false;
        }
        if (valid) {
          // ':' is allowed in identifiers, but is also the
          // pseudo-selector separator, so ':' in preceding parts needs to
          // be escaped.
          var selector = (element + classId).replace(/[^ .*#\w-]/g, '\\$&')
              + attrs + pseudoSelector + combinator;
          if (selector) { out.push(selector); }
        }
        return valid;
      }

      if (valid) {
        if (out.length) {
          var safeSelector = out.join('');

          // Namespace the selector so that it only matches under
          // a node with suffix in its CLASS attribute.
          if (containerClass !== null) {
            safeSelector = '.' + containerClass + ' ' + safeSelector;
          }

          sanitized.push(safeSelector);
        }  // else nothing there.
        return true;
      } else {
        return !opt_onUntranslatableSelector
          || opt_onUntranslatableSelector(selectors.slice(start, end));
      }
    }
    return sanitized;
  };

  (function () {
    var MEDIA_TYPE =
       '(?:'
       + 'all|aural|braille|embossed|handheld|print'
       + '|projection|screen|speech|tty|tv'
       + ')';

    // A white-list of media features extracted from the "Pseudo-BNF" in
    // http://dev.w3.org/csswg/mediaqueries4/#media1 and
    // https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Media_queries
    var MEDIA_FEATURE =
       '(?:'
       + '(?:min-|max-)?'
       + '(?:' + (
           '(?:device-)?'
         + '(?:aspect-ratio|height|width)'
         + '|color(?:-index)?'
         + '|monochrome'
         + '|orientation'
         + '|resolution'
       )
       + ')'
       + '|grid'
       + '|hover'
       + '|luminosity'
       + '|pointer'
       + '|scan'
       + '|script'
       + ')';

    var LENGTH_UNIT = '(?:p[cxt]|[cem]m|in|dpi|dppx|dpcm|%)';

    var CSS_VALUE =
       '-?(?:'
       + '[a-z]\\w+(?:-\\w+)*'  // An identifier
       // A length or scalar quantity, or a rational number.
       // dev.w3.org/csswg/mediaqueries4/#values introduces a ratio value-type
       // to allow matching aspect ratios like "4 / 3".
       + '|\\d+(?: / \\d+|(?:\\.\\d+)?' + LENGTH_UNIT + '?)'
       + ')';

    var MEDIA_EXPR =
       '\\( ' + MEDIA_FEATURE + ' (?:' + ': ' + CSS_VALUE + ' )?\\)';

    var MEDIA_QUERY =
       '(?:'
       + '(?:(?:(?:only|not) )?' + MEDIA_TYPE + '|' + MEDIA_EXPR + ')'
       // We use 'and ?' since 'and(' is a single CSS function token while
       // 'and (' parses to two separate tokens -- IDENT "and", DELIM "(".
       + '(?: and ?' + MEDIA_EXPR + ')*'
       + ')';

    var STARTS_WITH_KEYWORD_REGEXP = /^\w/;

    var MEDIA_QUERY_LIST_REGEXP = new RegExp(
      '^' + MEDIA_QUERY + '(?: , ' + MEDIA_QUERY + ')*' + '$',
      'i'
    );

    /**
     * Sanitizes a media query as defined in
     * http://dev.w3.org/csswg/mediaqueries4/#syntax
     * <blockquote>
     * Media Queries allow authors to adapt the style applied to a document
     * based on the environment the document is being rendered in.
     * </blockquote>
     *
     * @param {Array.<string>} cssTokens an array of tokens of the kind produced
     *   by cssLexers.
     * @return {string} a CSS media query.  This may be the empty string, or if
     *   the input is invalid, then a query that is always false.
     */
    sanitizeMediaQuery = function (cssTokens) {
      cssTokens = cssTokens.slice();
      // Strip out space tokens.
      var nTokens = cssTokens.length, k = 0;
      for (var i = 0; i < nTokens; ++i) {
        var tok = cssTokens[i];
        if (tok != ' ') { cssTokens[k++] = tok; }
      }
      cssTokens.length = k;
      var css = cssTokens.join(' ');
      css = (
        !css.length ? ''  // Always true per the spec.
        : !(MEDIA_QUERY_LIST_REGEXP.test(css)) ? 'not all'  // Always false.
        // Emit as-is if it starts with 'only', 'not' or a media type.
        : STARTS_WITH_KEYWORD_REGEXP.test(css) ? css
        : 'not all , ' + css  // Not ambiguous with a URL.
      );
      return css;
    };
  }());

  (function () {

    /**
     * Extracts a url out of an at-import rule of the form:
     *   \@import "mystyle.css";
     *   \@import url("mystyle.css");
     *
     * Returns null if no valid url was found.
     */
    function cssParseUri(candidate) {
      var string1 = /^\s*["]([^"]*)["]\s*$/;
      var string2 = /^\s*[']([^']*)[']\s*$/;
      var url1 = /^\s*url\s*[(]["]([^"]*)["][)]\s*$/;
      var url2 = /^\s*url\s*[(][']([^']*)['][)]\s*$/;
      // Not officially part of the CSS2.1 grammar
      // but supported by Chrome
      var url3 = /^\s*url\s*[(]([^)]*)[)]\s*$/;
      var match;
      if ((match = string1.exec(candidate))) {
        return match[1];
      } else if ((match = string2.exec(candidate))) {
        return match[1];
      } else if ((match = url1.exec(candidate))) {
        return match[1];
      } else if ((match = url2.exec(candidate))) {
        return match[1];
      } else if ((match = url3.exec(candidate))) {
        return match[1];
      }
      return null;
    }

    /**
     * @param {string} baseUri a string against which relative urls are
     *    resolved.
     * @param {string} cssText a string containing a CSS stylesheet.
     * @param {{
     *     containerClass: ?string,
     *     idSuffix: string,
     *     tagPolicy: function(string, Array.<string>): ?Array.<string>,
     *     virtualizeAttrName: ?function(string, string): ?string
     *   }} virtualization An object like <pre<{
     *   containerClass: class name prepended to all selectors to scope them (if
     *       not null)
     *   idSuffix: appended to all IDs to scope them
     *   tagPolicy: As in html-sanitizer, used for rewriting element names.
     *   virtualizeAttrName: Rewrite a single attribute name for attribute
     *       selectors, or return null if not possible. Should be consistent
     *       with tagPolicy if possible. Optional.
     * }</pre>
     *    If containerClass is {@code "sfx"} and idSuffix is {@code "-sfx"}, the
     *    selector
     *    {@code ["a", "#foo", " ", "b", ".bar"]} will be namespaced to
     *    {@code [".sfx", " ", "a", "#foo-sfx", " ", "b", ".bar"]}.
     * @param {function(string, string)} naiveUriRewriter maps URLs of media
     *    (images, sounds) that appear as CSS property values to sanitized
     *    URLs or null if the URL should not be allowed as an external media
     *    file in sanitized CSS.
     * @param {undefined|function({toString: function ():string}, boolean)}
     *     continuation
     *     callback that receives the result of loading imported CSS.
     *     The callback is called with
     *     (cssContent : function ():string, moreToCome : boolean)
     *     where cssContent is the CSS at the imported URL, and moreToCome is
     *     true when the external URL itself loaded other external URLs.
     *     If the output of the original call is stringified when moreToCome is
     *     false, then it will be complete.
     * @param {Array.<number>} opt_importCount the number of imports that need
     *     to be satisfied before there is no more pending content.
     * @return {{result:{toString:function ():string},moreToCome:boolean}}
     *     the CSS text, and a flag that indicates whether there are pending
     *     imports that will be passed to continuation.
     */
    function sanitizeStylesheetInternal(
        baseUri, cssText, virtualization, naiveUriRewriter, naiveUriFetcher,
        continuation, opt_importCount) {
      var safeCss = void 0;
      // Return a result with moreToCome===true when the last import has been
      // sanitized.
      var importCount = opt_importCount || [0];
      // A stack describing the { ... } regions.
      // Null elements indicate blocks that should not be emitted.
      var blockStack = [];
      // True when the content of the current block should be left off safeCss.
      var elide = false;
      parseCssStylesheet(
          cssText,
          {
            'startStylesheet': function () {
              safeCss = [];
            },
            'endStylesheet': function () {
            },
            'startAtrule': function (atIdent, headerArray) {
              if (elide) {
                atIdent = null;
              } else if (atIdent === '@media') {
                safeCss.push('@media', ' ', sanitizeMediaQuery(headerArray));
              } else if (atIdent === '@keyframes'
                         || atIdent === '@-webkit-keyframes') {
                var animationId = headerArray[0];
                if (headerArray.length === 1
                    && !/__$|[^\w\-]/.test(animationId)) {
                  safeCss.push(
                      atIdent, ' ', animationId + virtualization.idSuffix);
                  atIdent = '@keyframes';
                } else {
                  atIdent = null;
                }
              } else {
                if (atIdent === '@import' && headerArray.length > 0) {
                  atIdent = null;
                  if ('function' === typeof continuation) {
                    var mediaQuery = sanitizeMediaQuery(headerArray.slice(1));
                    if (mediaQuery !== 'not all') {
                      ++importCount[0];
                      var placeholder = [];
                      safeCss.push(placeholder);
                      var cssUrl = safeUri(
                          resolveUri(baseUri, cssParseUri(headerArray[0])),
                          function(result) {
                            var sanitized = sanitizeStylesheetInternal(
                                cssUrl, result.html, virtualization,
                                naiveUriRewriter, naiveUriFetcher,
                                continuation, importCount);
                            --importCount[0];
                            var safeImportedCss = mediaQuery
                              ? {
                                toString: function () {
                                  return (
                                    '@media ' + mediaQuery + ' {'
                                    + sanitized.result + '}'
                                  );
                                }
                              }
                              : sanitized.result;
                            placeholder[0] = safeImportedCss;
                            continuation(safeImportedCss, !!importCount[0]);
                          },
                          naiveUriFetcher);
                    }
                  } else {
                    // TODO: Use a logger instead.
                    if (window.console) {
                      window.console.log(
                          '@import ' + headerArray.join(' ') + ' elided');
                    }
                  }
                }
              }
              elide = !atIdent;
              blockStack.push(atIdent);
            },
            'endAtrule': function () {
              blockStack.pop();
              if (!elide) {
                safeCss.push(';');
              }
              checkElide();
            },
            'startBlock': function () {
              // There are no bare blocks in CSS, so we do not change the
              // block stack here, but instead in the events that bracket
              // blocks.
              if (!elide) {
                safeCss.push('{');
              }
            },
            'endBlock': function () {
              if (!elide) {
                safeCss.push('}');
                elide = true;  // skip any semicolon from endAtRule.
              }
            },
            'startRuleset': function (selectorArray) {
              if (!elide) {
                var selector = void 0;
                if (blockStack[blockStack.length - 1] === '@keyframes') {
                  // Allow [from | to | <percentage>]
                  selector = selectorArray.join(' ')
                    .match(/^ *(?:from|to|\d+(?:\.\d+)?%) *(?:, *(?:from|to|\d+(?:\.\d+)?%) *)*$/i);
                  elide = !selector;
                  if (selector) { selector = selector[0].replace(/ +/g, ''); }
                } else {
                  var selectors = sanitizeCssSelectorList(
                      selectorArray, virtualization);
                  if (!selectors || !selectors.length) {
                    elide = true;
                  } else {
                    selector = selectors.join(', ');
                  }
                }
                if (!elide) {
                  safeCss.push(selector, '{');
                }
              }
              blockStack.push(null);
            },
            'endRuleset': function () {
              blockStack.pop();
              if (!elide) {
                safeCss.push('}');
              }
              checkElide();
            },
            'declaration': function (property, valueArray) {
              if (!elide) {
                var isImportant = false;
                var nValues = valueArray.length;
                if (nValues >= 2
                    && valueArray[nValues - 2] === '!'
                    && valueArray[nValues - 1].toLowerCase() === 'important') {
                  isImportant = true;
                  valueArray.length -= 2;
                }
                sanitizeCssProperty(
                    property, valueArray, naiveUriRewriter, baseUri,
                    virtualization.idSuffix);
                if (valueArray.length) {
                  safeCss.push(
                      property, ':', valueArray.join(' '),
                      isImportant ? ' !important;' : ';');
                }
              }
            }
          });
      function checkElide() {
        elide = blockStack.length && blockStack[blockStack.length-1] === null;
      }
      return {
        result : { toString: function () { return safeCss.join(''); } },
        moreToCome : !!importCount[0]
      };
    }

    sanitizeStylesheet = function (
        baseUri, cssText, virtualization, naiveUriRewriter) {
      return sanitizeStylesheetInternal(
          baseUri, cssText, virtualization,
          naiveUriRewriter, undefined, undefined).result.toString();
    };

    sanitizeStylesheetWithExternals = function (
        baseUri, cssText, virtualization, naiveUriRewriter, naiveUriFetcher,
        continuation) {
      return sanitizeStylesheetInternal(
          baseUri, cssText, virtualization,
          naiveUriRewriter, naiveUriFetcher, continuation);
    };
  })();
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['sanitizeCssProperty'] = sanitizeCssProperty;
  window['sanitizeCssSelectorList'] = sanitizeCssSelectorList;
  window['sanitizeStylesheet'] = sanitizeStylesheet;
  window['sanitizeMediaQuery'] = sanitizeMediaQuery;
}
