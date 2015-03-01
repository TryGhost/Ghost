(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var listRE = /^(\s*)([*+-]|(\d+)\.)(\s*)/,
      unorderedBullets = "*+-";

  CodeMirror.commands.newlineAndIndentContinueMarkdownList = function(cm) {
    if (cm.getOption("disableInput")) return CodeMirror.Pass;
    var ranges = cm.listSelections(), replacements = [];
    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].head, match;
      var inList = cm.getStateAfter(pos.line).list !== false;

      if (!ranges[i].empty() || !inList || !(match = cm.getLine(pos.line).match(listRE))) {
        cm.execCommand("newlineAndIndent");
        return;
      }
      var indent = match[1], after = match[4];
      var bullet = unorderedBullets.indexOf(match[2]) >= 0
        ? match[2]
        : (parseInt(match[3], 10) + 1) + ".";

      replacements[i] = "\n" + indent + bullet + after;
    }

    cm.replaceSelections(replacements);
  };
});
