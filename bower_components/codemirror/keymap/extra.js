// A number of additional default bindings that are too obscure to
// include in the core codemirror.js file.

(function() {
  "use strict";

  var Pos = CodeMirror.Pos;

  function moveLines(cm, start, end, dist) {
    if (!dist || start > end) return 0;

    var from = cm.clipPos(Pos(start, 0)), to = cm.clipPos(Pos(end));
    var text = cm.getRange(from, to);

    if (start <= cm.firstLine())
      cm.replaceRange("", from, Pos(to.line + 1, 0));
    else
      cm.replaceRange("", Pos(from.line - 1), to);
    var target = from.line + dist;
    if (target <= cm.firstLine()) {
      cm.replaceRange(text + "\n", Pos(target, 0));
      return cm.firstLine() - from.line;
    } else {
      var targetPos = cm.clipPos(Pos(target - 1));
      cm.replaceRange("\n" + text, targetPos);
      return targetPos.line + 1 - from.line;
    }
  }

  function moveSelectedLines(cm, dist) {
    var head = cm.getCursor("head"), anchor = cm.getCursor("anchor");
    cm.operation(function() {
      var moved = moveLines(cm, Math.min(head.line, anchor.line), Math.max(head.line, anchor.line), dist);
      cm.setSelection(Pos(anchor.line + moved, anchor.ch), Pos(head.line + moved, head.ch));
    });
  }

  CodeMirror.commands.moveLinesUp = function(cm) { moveSelectedLines(cm, -1); };
  CodeMirror.commands.moveLinesDown = function(cm) { moveSelectedLines(cm, 1); };

  CodeMirror.keyMap["default"]["Alt-Up"] = "moveLinesUp";
  CodeMirror.keyMap["default"]["Alt-Down"] = "moveLinesDown";
})();
