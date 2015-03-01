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
 * A lexical scannar for CSS3 as defined at http://www.w3.org/TR/css3-syntax .
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 * \@provides lexCss, decodeCss
 * \@overrides window
 */

var lexCss;
var decodeCss;

(function () {

  /**
   * Decodes an escape sequence as specified in CSS3 section 4.1.
   * http://www.w3.org/TR/css3-syntax/#characters
   * @private
   */
  function decodeCssEscape(s) {
    var i = parseInt(s.substring(1), 16);
    // If parseInt didn't find a hex diigt, it returns NaN so return the
    // escaped character.
    // Otherwise, parseInt will stop at the first non-hex digit so there's no
    // need to worry about trailing whitespace.
    if (i > 0xffff) {
      // A supplemental codepoint.
      return i -= 0x10000,
        String.fromCharCode(
            0xd800 + (i >> 10),
            0xdc00 + (i & 0x3FF));
    } else if (i == i) {
      return String.fromCharCode(i);
    } else if (s[1] < ' ') {
      // "a backslash followed by a newline is ignored".
      return '';
    } else {
      return s[1];
    }
  }

  /**
   * Returns an equivalent CSS string literal given plain text: foo -> "foo".
   * @private
   */
  function escapeCssString(s, replacer) {
    return '"' + s.replace(/[\u0000-\u001f\\\"<>]/g, replacer) + '"';
  }

  /**
   * Maps chars to CSS escaped equivalents: "\n" -> "\\a ".
   * @private
   */
  function escapeCssStrChar(ch) {
    return cssStrChars[ch]
        || (cssStrChars[ch] = '\\' + ch.charCodeAt(0).toString(16) + ' ');
  }

  /**
   * Maps chars to URI escaped equivalents: "\n" -> "%0a".
   * @private
   */
  function escapeCssUrlChar(ch) {
    return cssUrlChars[ch]
        || (cssUrlChars[ch] = (ch < '\x10' ? '%0' : '%')
            + ch.charCodeAt(0).toString(16));
  }

  /**
   * Mapping of CSS special characters to escaped equivalents.
   * @private
   */
  var cssStrChars = {
    '\\': '\\\\'
  };

  /**
   * Mapping of CSS special characters to URL-escaped equivalents.
   * @private
   */
  var cssUrlChars = {
    '\\': '%5c'
  };

  // The comments below are copied from the CSS3 module syntax at
  // http://www.w3.org/TR/css3-syntax .
  // These string constants minify out when this is run-through closure
  // compiler.
  // Rules that have been adapted have comments prefixed with "Diff:", and
  // where rules have been combined to avoid back-tracking in the regex engine
  // or to work around limitations, there is a comment prefixed with
  // "NewRule:".

  // In the below, we assume CRLF and CR have been normalize to CR.

  // wc  ::=  #x9 | #xA | #xC | #xD | #x20
  var WC = '[\\t\\n\\f ]';
  // w  ::=  wc*
  var W = WC + '*';
  // nl  ::=  #xA | #xD #xA | #xD | #xC
  var NL = '[\\n\\f]';
  // nonascii  ::=  [#x80-#xD7FF#xE000-#xFFFD#x10000-#x10FFFF]
  // NewRule: Supplemental codepoints are represented as surrogate pairs in JS.
  var SURROGATE_PAIR = '[\\ud800-\\udbff][\\udc00-\\udfff]';
  var NONASCII = '[\\u0080-\\ud7ff\\ue000-\\ufffd]|' + SURROGATE_PAIR;
  // unicode  ::=  '\' [0-9a-fA-F]{1,6} wc?
  // NewRule: No point in having ESCAPE do (\\x|\\y)
  var UNICODE_TAIL = '[0-9a-fA-F]{1,6}' + WC + '?';
  var UNICODE = '\\\\' + UNICODE_TAIL;
  // escape  ::=  unicode
  //           | '\' [#x20-#x7E#x80-#xD7FF#xE000-#xFFFD#x10000-#x10FFFF]
  // NewRule: Below we use escape tail to efficiently match an escape or a
  // line continuation so we can decode string content.
  var ESCAPE_TAIL = '(?:' + UNICODE_TAIL
      + '|[\\u0020-\\u007e\\u0080-\\ud7ff\\ue000\\ufffd]|'
      + SURROGATE_PAIR + ')';
  var ESCAPE = '\\\\' + ESCAPE_TAIL;
  // urlchar  ::=  [#x9#x21#x23-#x26#x28-#x7E] | nonascii | escape
  var URLCHAR = '(?:[\\t\\x21\\x23-\\x26\\x28-\\x5b\\x5d-\\x7e]|'
      + NONASCII + '|' + ESCAPE + ')';
  // stringchar  ::= urlchar | #x20 | '\' nl
  // We ignore mismatched surrogate pairs inside strings, so stringchar
  // simplifies to a non-(quote|newline|backslash) or backslash any.
  // Since we normalize CRLF to a single code-unit, there is no special
  // handling needed for '\\' + CRLF.
  var STRINGCHAR = '[^\'"\\n\\f\\\\]|\\\\[\\s\\S]';
  // string  ::=  '"' (stringchar | "'")* '"' | "'" (stringchar | '"')* "'"
  var STRING = '"(?:\'|' + STRINGCHAR + ')*"'
      + '|\'(?:\"|' + STRINGCHAR + ')*\'';
  // num  ::=  [0-9]+ | [0-9]* '.' [0-9]+
  // Diff: We attach signs to num tokens.
  var NUM = '[-+]?(?:[0-9]+(?:[.][0-9]+)?|[.][0-9]+)';
  // nmstart  ::=  [a-zA-Z] | '_' | nonascii | escape
  var NMSTART = '(?:[a-zA-Z_]|' + NONASCII + '|' + ESCAPE + ')';
  // nmchar  ::=  [a-zA-Z0-9] | '-' | '_' | nonascii | escape
  var NMCHAR = '(?:[a-zA-Z0-9_-]|' + NONASCII + '|' + ESCAPE + ')';
  // name  ::=  nmchar+
  var NAME = NMCHAR + '+';
  // ident  ::=  '-'? nmstart nmchar*
  var IDENT = '-?' + NMSTART + NMCHAR + '*';

  // ATKEYWORD  ::=  '@' ident
  var ATKEYWORD = '@' + IDENT;
  // HASH  ::=  '#' name
  var HASH = '#' + NAME;
  // NUMBER  ::=  num
  var NUMBER = NUM;

  // NewRule: union of IDENT, ATKEYWORD, HASH, but excluding #[0-9].
  var WORD_TERM = '(?:@?-?' + NMSTART + '|#)' + NMCHAR + '*';

  // PERCENTAGE  ::=  num '%'
  var PERCENTAGE = NUM + '%';
  // DIMENSION  ::=  num ident
  var DIMENSION = NUM + IDENT;
  var NUMERIC_VALUE = NUM + '(?:%|' + IDENT + ')?';
  // URI  ::=  "url(" w (string | urlchar* ) w ")"
  var URI = 'url[(]' + W + '(?:' + STRING + '|' + URLCHAR + '*)' + W + '[)]';
  // UNICODE-RANGE  ::=  "U+" [0-9A-F?]{1,6} ('-' [0-9A-F]{1,6})?
  var UNICODE_RANGE = 'U[+][0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?';
  // CDO  ::=  "<\!--"
  var CDO = '<\!--';
  // CDC  ::=  "-->"
  var CDC = '-->';
  // S  ::=  wc+
  var S = WC + '+';
  // COMMENT  ::=  "/*" [^*]* '*'+ ([^/] [^*]* '*'+)* "/"
  // Diff: recognizes // comments.
  var COMMENT = '/(?:[*][^*]*[*]+(?:[^/][^*]*[*]+)*/|/[^\\n\\f]*)';
  // FUNCTION  ::=  ident '('
  // Diff: We exclude url explicitly.
  // TODO: should we be tolerant of "fn ("?
  var FUNCTION = '(?!url[(])' + IDENT + '[(]';
  // INCLUDES  ::=  "~="
  var INCLUDES = '~=';
  // DASHMATCH  ::=  "|="
  var DASHMATCH = '[|]=';
  // PREFIXMATCH  ::=  "^="
  var PREFIXMATCH = '[^]=';
  // SUFFIXMATCH  ::=  "$="
  var SUFFIXMATCH = '[$]=';
  // SUBSTRINGMATCH  ::=  "*="
  var SUBSTRINGMATCH = '[*]=';
  // NewRule: one rule for all the comparison operators.
  var CMP_OPS = '[~|^$*]=';
  // CHAR  ::=  any character not matched by the above rules, except for " or '
  // Diff: We exclude / and \ since they are handled above to prevent
  // /* without a following */ from combining when comments are concatenated.
  var CHAR = '[^"\'\\\\/]|/(?![/*])';
  // BOM  ::=  #xFEFF
  var BOM = '\\uFEFF';

  var CSS_TOKEN = new RegExp([
      BOM, UNICODE_RANGE, URI, FUNCTION, WORD_TERM, STRING, NUMERIC_VALUE,
      CDO, CDC, S, COMMENT, CMP_OPS, CHAR].join("|"), 'gi');

  var CSS_DECODER = new RegExp('\\\\(?:' + ESCAPE_TAIL + '|' + NL + ')', 'g');
  var URL_RE = new RegExp('^url\\(' + W + '["\']?|["\']?' + W + '\\)$', 'gi');
  /**
   * Decodes CSS escape sequences in a CSS string body.
   */
   decodeCss = function (css) {
     return css.replace(CSS_DECODER, decodeCssEscape);
   };

  /**
   * Given CSS Text, returns an array of normalized tokens.
   * @param {string} cssText
   * @return {Array.<string>} tokens where all ignorable token sequences have
   *    been reduced to a single {@code " "} and all strings and
   *    {@code url(...)} tokens have been normalized to use double quotes as
   *    delimiters and to not otherwise contain double quotes.
   */
  lexCss = function (cssText) {
    cssText = '' + cssText;
    var tokens = cssText.replace(/\r\n?/g, '\n')  // Normalize CRLF & CR to LF.
        .match(CSS_TOKEN) || [];
    var j = 0;
    var last = ' ';
    for (var i = 0, n = tokens.length; i < n; ++i) {
      // Normalize all escape sequences.  We will have to re-escape some
      // codepoints in string and url(...) bodies but we already know the
      // boundaries.
      // We might mistakenly treat a malformed identifier like \22\20\22 as a
      // string, but that will not break any valid stylesheets since we requote
      // and re-escape in string below.
      var tok = decodeCss(tokens[i]);
      var len = tok.length;
      var cc = tok.charCodeAt(0);
      tok =
          // All strings should be double quoted, and the body should never
          // contain a double quote.
          (cc == '"'.charCodeAt(0) || cc == '\''.charCodeAt(0))
          ? escapeCssString(tok.substring(1, len - 1), escapeCssStrChar)
          // A breaking ignorable token should is replaced with a single space.
          : (cc == '/'.charCodeAt(0) && len > 1  // Comment.
             || tok == '\\' || tok == CDC || tok == CDO || tok == '\ufeff'
             // Characters in W.
             || cc <= ' '.charCodeAt(0))
          ? ' '
          // Make sure that all url(...)s are double quoted.
          : /url\(/i.test(tok)
          ? 'url(' + escapeCssString(
            tok.replace(URL_RE, ''),
            escapeCssUrlChar)
            + ')'
          // Escapes in identifier like tokens will have been normalized above.
          : tok;
      // Merge adjacent space tokens.
      if (last != tok || tok != ' ') {
        tokens[j++] = last = tok;
      }
    }
    tokens.length = j;
    return tokens;
  };
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['lexCss'] = lexCss;
  window['decodeCss'] = decodeCss;
}
