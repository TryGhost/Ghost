// Copyright (C) 2010 Google Inc.
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
 * Utilities for dealing with CSS source code.
 *
 * @author mikesamuel@gmail.com
 * \@requires lexCss
 * \@overrides window
 * \@provides parseCssStylesheet, parseCssDeclarations
 */

// The Turkish i seems to be a non-issue, but abort in case it is.
if ('I'.toLowerCase() !== 'i') { throw 'I/i problem'; }

/**
 * parseCssStylesheet takes a chunk of CSS text and a handler object with
 * methods that it calls as below:
 * <pre>
 * // At the beginning of a stylesheet.
 * handler.startStylesheet();
 *
 * // For an @foo rule ended by a semicolon: @import "foo.css";
 * handler.startAtrule('@import', ['"foo.css"']);
 * handler.endAtrule();
 *
 * // For an @foo rule ended with a block. @media print { ... }
 * handler.startAtrule('@media', ['print']);
 * handler.startBlock();
 * // Calls to contents elided.  Probably selectors and declarations as below.
 * handler.endBlock();
 * handler.endAtrule();
 *
 * // For a ruleset: p.clazz q, s { color: blue; }
 * handler.startRuleset(['p', '.', 'clazz', ' ', 'q', ',', ' ', 's']);
 * handler.declaration('color', ['blue']);
 * handler.endRuleset();
 *
 * // At the end of a stylesheet.
 * handler.endStylesheet();
 * </pre>
 * When errors are encountered, the parser drops the useless tokens and
 * attempts to resume parsing.
 *
 * @param {string} cssText CSS3 content to parse as a stylesheet.
 * @param {Object} handler An object like <pre>{
 *   startStylesheet: function () { ... },
 *   endStylesheet: function () { ... },
 *   startAtrule: function (atIdent, headerArray) { ... },
 *   endAtrule: function () { ... },
 *   startBlock: function () { ... },
 *   endBlock: function () { ... },
 *   startRuleset: function (selectorArray) { ... },
 *   endRuleset: function () { ... },
 *   declaration: function (property, valueArray) { ... },
 * }</pre>
 */
var parseCssStylesheet;

/**
 * parseCssDeclarations parses a run of declaration productions as seen in the
 * body of the HTML5 {@code style} attribute.
 *
 * @param {string} cssText CSS3 content to parse as a run of declarations.
 * @param {Object} handler An object like <pre>{
 *   declaration: function (property, valueArray) { ... },
 * }</pre>
 */
var parseCssDeclarations;

(function () {
  // stylesheet  : [ CDO | CDC | S | statement ]*;
  parseCssStylesheet = function(cssText, handler) {
    var toks = lexCss(cssText);
    if (handler['startStylesheet']) { handler['startStylesheet'](); }
    for (var i = 0, n = toks.length; i < n;) {
      // CDO and CDC ("<!--" and "-->") are converted to space by the lexer.
      i = toks[i] === ' ' ? i+1 : statement(toks, i, n, handler);
    }
    if (handler['endStylesheet']) { handler['endStylesheet'](); }
  };

  // statement   : ruleset | at-rule;
  function statement(toks, i, n, handler) {
    if (i < n) {
      var tok = toks[i];
      if (tok.charAt(0) === '@') {
        return atrule(toks, i, n, handler, true);
      } else {
        return ruleset(toks, i, n, handler);
      }
    } else {
      return i;
    }
  }

  // at-rule     : ATKEYWORD S* any* [ block | ';' S* ];
  function atrule(toks, i, n, handler, blockok) {
    var start = i++;
    while (i < n && toks[i] !== '{' && toks[i] !== ';') {
      ++i;
    }
    if (i < n && (blockok || toks[i] === ';')) {
      var s = start+1, e = i;
      if (s < n && toks[s] === ' ') { ++s; }
      if (e > s && toks[e-1] === ' ') { --e; }
      if (handler['startAtrule']) {
        handler['startAtrule'](toks[start].toLowerCase(), toks.slice(s, e));
      }
      i = (toks[i] === '{')
          ? block(toks, i, n, handler)
          : i+1;  // Skip over ';'
      if (handler['endAtrule']) {
        handler['endAtrule']();
      }
    }
    // Else we reached end of input or are missing a semicolon.
    // Drop the rule on the floor.
    return i;
  }

  // block       : '{' S* [ any | block | ATKEYWORD S* | ';' S* ]* '}' S*;
   // Assumes the leading '{' has been verified by callers.
  function block(toks, i, n, handler) {
    ++i; //  skip over '{'
    if (handler['startBlock']) { handler['startBlock'](); }
    while (i < n) {
      var ch = toks[i].charAt(0);
      if (ch == '}') {
        ++i;
        break;
      }
      if (ch === ' ' || ch === ';') {
        i = i+1;
      } else if (ch === '@') {
        i = atrule(toks, i, n, handler, false);
      } else if (ch === '{') {
        i = block(toks, i, n, handler);
      } else {
        // Instead of using (any* block) to subsume ruleset we allow either
        // blocks or rulesets with a non-blank selector.
        // This is more restrictive but does not require atrule specific
        // parse tree fixup to realize that the contents of the block in
        //    @media print { ... }
        // is a ruleset.  We just don't care about any block carrying at-rules
        // whose body content is not ruleset content.
        i = ruleset(toks, i, n, handler);
      }
    }
    if (handler['endBlock']) { handler['endBlock'](); }
    return i;
  }

  // ruleset    : selector? '{' S* declaration? [ ';' S* declaration? ]* '}' S*;
  function ruleset(toks, i, n, handler) {
    // toks[s:e] are the selector tokens including internal whitespace.
    var s = i, e = selector(toks, i, n, true);
    if (e < 0) {
      // Skip malformed content per selector calling convention.
      e = ~e;
      // Make sure we skip at least one token.
      return e === s ? e+1 : e;
    }
    var tok = toks[e];
    if (tok !== '{') {
      // Make sure we skip at least one token.
      return e === s ? e+1 : e;
    }
    i = e+1;  // Skip over '{'
    // Don't include any trailing space in the selector slice.
    if (e > s && toks[e-1] === ' ') { --e; }
    if (handler['startRuleset']) {
      handler['startRuleset'](toks.slice(s, e));
    }
    while (i < n) {
      tok = toks[i];
      if (tok === '}') {
        ++i;
        break;
      }
      if (tok === ' ') {
        i = i+1;
      } else {
        i = declaration(toks, i, n, handler);
      }
    }
    if (handler['endRuleset']) {
      handler['endRuleset']();
    }
    return i;
  }

  // selector    : any+;
  // any         : [ IDENT | NUMBER | PERCENTAGE | DIMENSION | STRING
  //               | DELIM | URI | HASH | UNICODE-RANGE | INCLUDES
  //               | FUNCTION S* any* ')' | DASHMATCH | '(' S* any* ')'
  //               | '[' S* any* ']' ] S*;
  // A negative return value, rv, indicates the selector was malformed and
  // the index at which we stopped is ~rv.
  function selector(toks, i, n, allowSemi) {
    var s = i;
    // The definition of any above can be summed up as
    //   "any run of token except ('[', ']', '(', ')', ':', ';', '{', '}')
    //    or nested runs of parenthesized tokens or square bracketed tokens".
    // Spaces are significant in the selector.
    // Selector is used as (selector?) so the below looks for (any*) for
    // simplicity.
    var tok;
    // Keeping a stack pointer actually causes this to minify better since
    // ".length" and ".push" are a lo of chars.
    var brackets = [], stackLast = -1;
    for (;i < n; ++i) {
      tok = toks[i].charAt(0);
      if (tok === '[' || tok === '(') {
        brackets[++stackLast] = tok;
      } else if ((tok === ']' && brackets[stackLast] === '[') ||
                 (tok === ')' && brackets[stackLast] === '(')) {
        --stackLast;
      } else if (tok === '{' || tok === '}' || tok === ';' || tok === '@'
                 || (tok === ':' && !allowSemi)) {
        break;
      }
    }
    if (stackLast >= 0) {
      // Returns the bitwise inverse of i+1 to indicate an error in the
      // token stream so that clients can ignore it.
      i = ~(i+1);
    }
    return i;
  }

  var ident = /^-?[a-z]/i;

  function skipDeclaration(toks, i, n) {
    // TODO(felix8a): maybe skip balanced pairs of {}
    while (i < n && toks[i] !== ';' && toks[i] !== '}') { ++i; }
    return i < n && toks[i] === ';' ? i+1 : i;
  }

  // declaration : property ':' S* value;
  // property    : IDENT S*;
  // value       : [ any | block | ATKEYWORD S* ]+;
  function declaration(toks, i, n, handler) {
    var property = toks[i++];
    if (!ident.test(property)) {
      return skipDeclaration(toks, i, n);
    }
    var tok;
    if (i < n && toks[i] === ' ') { ++i; }
    if (i == n || toks[i] !== ':') {
      return skipDeclaration(toks, i, n);
    }
    ++i;
    if (i < n && toks[i] === ' ') { ++i; }

    // None of the rules we care about want atrules or blocks in value, so
    // we look for any+ but that is the same as selector but not zero-length.
    // This gets us the benefit of not emitting any value with mismatched
    // brackets.
    var s = i, e = selector(toks, i, n, false);
    if (e < 0) {
      // Skip malformed content per selector calling convention.
      e = ~e;
    } else {
      var value = [], valuelen = 0;
      for (var j = s; j < e; ++j) {
        tok = toks[j];
        if (tok !== ' ') {
          value[valuelen++] = tok;
        }
      }
      // One of the following is now true:
      // (1) e is flush with the end of the tokens as in <... style="x:y">.
      // (2) tok[e] points to a ';' in which case we need to consume the semi.
      // (3) tok[e] points to a '}' in which case we don't consume it.
      // (4) else there is bogus unparsed value content at toks[e:].
      // Allow declaration flush with end for style attr body.
      if (e < n) {  // 2, 3, or 4
        do {
          tok = toks[e];
          if (tok === ';' || tok === '}') { break; }
          // Don't emit the property if there is questionable trailing content.
          valuelen = 0;
        } while (++e < n);
        if (tok === ';') {
          ++e;
        }
      }
      if (valuelen && handler['declaration']) {
        // TODO: coerce non-keyword ident tokens to quoted strings.
        handler['declaration'](property.toLowerCase(), value);
      }
    }
    return e;
  }

  parseCssDeclarations = function(cssText, handler) {
    var toks = lexCss(cssText);
    for (var i = 0, n = toks.length; i < n;) {
      i = toks[i] !== ' ' ? declaration(toks, i, n, handler) : i+1;
    }
  };
})();

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['parseCssStylesheet'] = parseCssStylesheet;
  window['parseCssDeclarations'] = parseCssDeclarations;
}
