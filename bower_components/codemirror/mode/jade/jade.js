(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("jade", function () {
  var symbol_regex1 = /^(?:~|!|%|\^|\*|\+|=|\\|:|;|,|\/|\?|&|<|>|\|)/;
  var open_paren_regex = /^(\(|\[)/;
  var close_paren_regex = /^(\)|\])/;
  var keyword_regex1 = /^(if|else|return|var|function|include|doctype|each)/;
  var keyword_regex2 = /^(#|{|}|\.)/;
  var keyword_regex3 = /^(in)/;
  var html_regex1 = /^(html|head|title|meta|link|script|body|br|div|input|span|a|img)/;
  var html_regex2 = /^(h1|h2|h3|h4|h5|p|strong|em)/;
  return {
    startState: function () {
      return {
        inString: false,
        stringType: "",
        beforeTag: true,
        justMatchedKeyword: false,
        afterParen: false
      };
    },
    token: function (stream, state) {
      //check for state changes
      if (!state.inString && ((stream.peek() == '"') || (stream.peek() == "'"))) {
        state.stringType = stream.peek();
        stream.next(); // Skip quote
        state.inString = true; // Update state
      }

      //return state
      if (state.inString) {
        if (stream.skipTo(state.stringType)) { // Quote found on this line
          stream.next(); // Skip quote
          state.inString = false; // Clear flag
        } else {
          stream.skipToEnd(); // Rest of line is string
        }
        state.justMatchedKeyword = false;
        return "string"; // Token style
      } else if (stream.sol() && stream.eatSpace()) {
        if (stream.match(keyword_regex1)) {
          state.justMatchedKeyword = true;
          stream.eatSpace();
          return "keyword";
        }
        if (stream.match(html_regex1) || stream.match(html_regex2)) {
          state.justMatchedKeyword = true;
          return "variable";
        }
      } else if (stream.sol() && stream.match(keyword_regex1)) {
        state.justMatchedKeyword = true;
        stream.eatSpace();
        return "keyword";
      } else if (stream.sol() && (stream.match(html_regex1) || stream.match(html_regex2))) {
        state.justMatchedKeyword = true;
        return "variable";
      } else if (stream.eatSpace()) {
        state.justMatchedKeyword = false;
        if (stream.match(keyword_regex3) && stream.eatSpace()) {
          state.justMatchedKeyword = true;
          return "keyword";
        }
      } else if (stream.match(symbol_regex1)) {
        state.justMatchedKeyword = false;
        return "atom";
      } else if (stream.match(open_paren_regex)) {
        state.afterParen = true;
        state.justMatchedKeyword = true;
        return "def";
      } else if (stream.match(close_paren_regex)) {
        state.afterParen = false;
        state.justMatchedKeyword = true;
        return "def";
      } else if (stream.match(keyword_regex2)) {
        state.justMatchedKeyword = true;
        return "keyword";
      } else if (stream.eatSpace()) {
        state.justMatchedKeyword = false;
      } else {
        stream.next();
        if (state.justMatchedKeyword) {
          return "property";
        } else if (state.afterParen) {
          return "property";
        }
      }
      return null;
    }
  };
});

CodeMirror.defineMIME('text/x-jade', 'jade');

});
