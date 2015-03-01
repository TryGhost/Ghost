(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineMode("jinja2", function() {
    var keywords = ["and", "as", "block", "endblock", "by", "cycle", "debug", "else", "elif",
                    "extends", "filter", "endfilter", "firstof", "for",
                    "endfor", "if", "endif", "ifchanged", "endifchanged",
                    "ifequal", "endifequal", "ifnotequal",
                    "endifnotequal", "in", "include", "load", "not", "now", "or",
                    "parsed", "regroup", "reversed", "spaceless",
                    "endspaceless", "ssi", "templatetag", "openblock",
                    "closeblock", "openvariable", "closevariable",
                    "openbrace", "closebrace", "opencomment",
                    "closecomment", "widthratio", "url", "with", "endwith",
                    "get_current_language", "trans", "noop", "blocktrans",
                    "endblocktrans", "get_available_languages",
                    "get_current_language_bidi", "plural"];
    keywords = new RegExp("^((" + keywords.join(")|(") + "))\\b");

    function tokenBase (stream, state) {
      var ch = stream.next();
      if (ch == "{") {
        if (ch = stream.eat(/\{|%|#/)) {
          stream.eat("-");
          state.tokenize = inTag(ch);
          return "tag";
        }
      }
    }
    function inTag (close) {
      if (close == "{") {
        close = "}";
      }
      return function (stream, state) {
        var ch = stream.next();
        if ((ch == close || (ch == "-" && stream.eat(close)))
            && stream.eat("}")) {
          state.tokenize = tokenBase;
          return "tag";
        }
        if (stream.match(keywords)) {
          return "keyword";
        }
        return close == "#" ? "comment" : "string";
      };
    }
    return {
      startState: function () {
        return {tokenize: tokenBase};
      },
      token: function (stream, state) {
        return state.tokenize(stream, state);
      }
    };
  });
});
