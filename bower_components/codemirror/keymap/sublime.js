// A rough approximation of Sublime Text's keybindings
// Depends on addon/search/searchcursor.js and optionally addon/dialog/dialogs.js

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../lib/codemirror"), require("../addon/search/searchcursor"), require("../addon/edit/matchbrackets"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../lib/codemirror", "../addon/search/searchcursor", "../addon/edit/matchbrackets"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var map = CodeMirror.keyMap.sublime = {fallthrough: "default"};
  var cmds = CodeMirror.commands;
  var Pos = CodeMirror.Pos;
  var ctrl = CodeMirror.keyMap["default"] == CodeMirror.keyMap.pcDefault ? "Ctrl-" : "Cmd-";

  // This is not exactly Sublime's algorithm. I couldn't make heads or tails of that.
  function findPosSubword(doc, start, dir) {
    if (dir < 0 && start.ch == 0) return doc.clipPos(Pos(start.line - 1));
    var line = doc.getLine(start.line);
    if (dir > 0 && start.ch >= line.length) return doc.clipPos(Pos(start.line + 1, 0));
    var state = "start", type;
    for (var pos = start.ch, e = dir < 0 ? 0 : line.length, i = 0; pos != e; pos += dir, i++) {
      var next = line.charAt(dir < 0 ? pos - 1 : pos);
      var cat = next != "_" && CodeMirror.isWordChar(next) ? "w" : "o";
      if (cat == "w" && next.toUpperCase() == next) cat = "W";
      if (state == "start") {
        if (cat != "o") { state = "in"; type = cat; }
      } else if (state == "in") {
        if (type != cat) {
          if (type == "w" && cat == "W" && dir < 0) pos--;
          if (type == "W" && cat == "w" && dir > 0) { type = "w"; continue; }
          break;
        }
      }
    }
    return Pos(start.line, pos);
  }

  function moveSubword(cm, dir) {
    cm.extendSelectionsBy(function(range) {
      if (cm.display.shift || cm.doc.extend || range.empty())
        return findPosSubword(cm.doc, range.head, dir);
      else
        return dir < 0 ? range.from() : range.to();
    });
  }

  cmds[map["Alt-Left"] = "goSubwordLeft"] = function(cm) { moveSubword(cm, -1); };
  cmds[map["Alt-Right"] = "goSubwordRight"] = function(cm) { moveSubword(cm, 1); };

  cmds[map[ctrl + "Up"] = "scrollLineUp"] = function(cm) {
    cm.scrollTo(null, cm.getScrollInfo().top - cm.defaultTextHeight());
  };
  cmds[map[ctrl + "Down"] = "scrollLineDown"] = function(cm) {
    cm.scrollTo(null, cm.getScrollInfo().top + cm.defaultTextHeight());
  };

  cmds[map["Shift-" + ctrl + "L"] = "splitSelectionByLine"] = function(cm) {
    var ranges = cm.listSelections(), lineRanges = [];
    for (var i = 0; i < ranges.length; i++) {
      var from = ranges[i].from(), to = ranges[i].to();
      for (var line = from.line; line <= to.line; ++line)
        if (!(to.line > from.line && line == to.line && to.ch == 0))
          lineRanges.push({anchor: line == from.line ? from : Pos(line, 0),
                           head: line == to.line ? to : Pos(line)});
    }
    cm.setSelections(lineRanges, 0);
  };

  map["Shift-Tab"] = "indentLess";

  cmds[map[ctrl + "L"] = "selectLine"] = function(cm) {
    var ranges = cm.listSelections(), prim = cm.getCursor(), primIndex, extended = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (range.head == prim) primIndex = i;
      extended.push({anchor: Pos(range.from().line, 0),
                     head: Pos(range.to().line + 1, 0)});
    }
    cm.setSelections(extended, primIndex);
  };

  function wordAt(cm, pos) {
    var start = pos.ch, end = start, line = cm.getLine(pos.line);
    while (start && CodeMirror.isWordChar(line.charAt(start - 1))) --start;
    while (end < line.length && CodeMirror.isWordChar(line.charAt(end))) ++end;
    return {from: Pos(pos.line, start), to: Pos(pos.line, end), word: line.slice(start, end)};
  }

  cmds[map[ctrl + "D"] = "selectNextOccurrence"] = function(cm) {
    var from = cm.getCursor("from"), to = cm.getCursor("to");
    var fullWord = cm.state.sublimeFindFullWord == cm.doc.sel;
    if (CodeMirror.cmpPos(from, to) == 0) {
      var word = wordAt(cm, from);
      if (!word.word) return;
      cm.setSelection(word.from, word.to);
      fullWord = true;
    } else {
      var query = cm.getRange(from, to);
      var cur = cm.getSearchCursor(fullWord ? new RegExp("\\b" + query + "\\b") : query, to);
      if (cur.findNext())
        cm.addSelection(cur.from(), cur.to());
    }
    if (fullWord)
      cm.state.sublimeFindFullWord = cm.doc.sel;
  };

  var mirror = "(){}[]";
  function selectBetweenBrackets(cm) {
    var pos = cm.getCursor(), opening = cm.scanForBracket(pos, -1);
    if (!opening) return;
    for (;;) {
      var closing = cm.scanForBracket(pos, 1);
      if (!closing) return;
      if (closing.ch == mirror.charAt(mirror.indexOf(opening.ch) + 1)) {
        cm.setSelection(Pos(opening.pos.line, opening.pos.ch + 1), closing.pos, false);
        return true;
      }
      pos = Pos(closing.pos.line, closing.pos.ch + 1);
    }
  }

  cmds[map["Shift-" + ctrl + "Space"] = "selectScope"] = function(cm) {
    selectBetweenBrackets(cm) || cm.execCommand("selectAll");
  };
  cmds[map["Shift-" + ctrl + "M"] = "selectBetweenBrackets"] = function(cm) {
    if (!selectBetweenBrackets(cm)) return CodeMirror.Pass;
  };

  cmds[map[ctrl + "M"] = "goToBracket"] = function(cm) {
    cm.extendSelectionsBy(function(range) {
      var next = cm.scanForBracket(range.head, 1);
      if (next && CodeMirror.cmpPos(next.pos, range.head) != 0) return next.pos;
      var prev = cm.scanForBracket(range.head, -1);
      return prev && Pos(prev.pos.line, prev.pos.ch + 1) || range.head;
    });
  };

  cmds[map["Shift-" + ctrl + "Up"] = "swapLineUp"] = function(cm) {
    var ranges = cm.listSelections(), linesToMove = [], at = cm.firstLine() - 1;
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], from = range.from().line - 1, to = range.to().line;
      if (from > at) linesToMove.push(from, to);
      else if (linesToMove.length) linesToMove[linesToMove.length - 1] = to;
      at = to;
    }
    cm.operation(function() {
      for (var i = 0; i < linesToMove.length; i += 2) {
        var from = linesToMove[i], to = linesToMove[i + 1];
        var line = cm.getLine(from);
        cm.replaceRange("", Pos(from, 0), Pos(from + 1, 0));
        cm.replaceRange(line + "\n", Pos(to, 0));
      }
    });
  };

  cmds[map["Shift-" + ctrl + "Down"] = "swapLineDown"] = function(cm) {
    var ranges = cm.listSelections(), linesToMove = [], at = cm.lastLine() + 1;
    for (var i = ranges.length - 1; i >= 0; i--) {
      var range = ranges[i], from = range.to().line + 1, to = range.from().line;
      if (from < at) linesToMove.push(from, to);
      else if (linesToMove.length) linesToMove[linesToMove.length - 1] = to;
      at = to;
    }
    cm.operation(function() {
      for (var i = linesToMove.length - 2; i >= 0; i -= 2) {
        var from = linesToMove[i], to = linesToMove[i + 1];
        var line = cm.getLine(from);
        if (from == cm.lastLine())
          cm.replaceRange("", Pos(from - 1), Pos(from));
        else
          cm.replaceRange("", Pos(from, 0), Pos(from + 1, 0));
        cm.replaceRange(line + "\n", Pos(to, 0));
      }
    });
  };

  map[ctrl + "/"] = "toggleComment";

  cmds[map[ctrl + "J"] = "joinLines"] = function(cm) {
    var ranges = cm.listSelections(), joined = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], from = range.from();
      var start = from.line, end = range.to().line;
      while (i < ranges.length - 1 && ranges[i + 1].from().line == end)
        end = ranges[++i].to().line;
      joined.push({start: start, end: end, anchor: !range.empty() && from});
    }
    cm.operation(function() {
      var offset = 0, ranges = [];
      for (var i = 0; i < joined.length; i++) {
        var obj = joined[i];
        var anchor = obj.anchor && Pos(obj.anchor.line - offset, obj.anchor.ch), head;
        for (var line = obj.start; line <= obj.end; line++) {
          var actual = line - offset;
          if (line == obj.end) head = Pos(actual, cm.getLine(actual).length + 1);
          if (actual < cm.lastLine()) {
            cm.replaceRange(" ", Pos(actual), Pos(actual + 1, /^\s*/.exec(cm.getLine(actual + 1))[0].length));
            ++offset;
          }
        }
        ranges.push({anchor: anchor || head, head: head});
      }
      cm.setSelections(ranges, 0);
    });
  };

  cmds[map["Shift-" + ctrl + "D"] = "duplicateLine"] = function(cm) {
    cm.operation(function() {
      var rangeCount = cm.listSelections().length;
      for (var i = 0; i < rangeCount; i++) {
        var range = cm.listSelections()[i];
        if (range.empty())
          cm.replaceRange(cm.getLine(range.head.line) + "\n", Pos(range.head.line, 0));
        else
          cm.replaceRange(cm.getRange(range.from(), range.to()), range.from());
      }
    });
  };

  map[ctrl + "T"] = "transposeChars";

  function sortLines(cm, caseSensitive) {
    var ranges = cm.listSelections(), toSort = [], selected;
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (range.empty()) continue;
      var from = range.from().line, to = range.to().line;
      while (i < ranges.length - 1 && ranges[i + 1].from().line == to)
        to = range[++i].to().line;
      toSort.push(from, to);
    }
    if (toSort.length) selected = true;
    else toSort.push(cm.firstLine(), cm.lastLine());

    cm.operation(function() {
      var ranges = [];
      for (var i = 0; i < toSort.length; i += 2) {
        var from = toSort[i], to = toSort[i + 1];
        var start = Pos(from, 0), end = Pos(to);
        var lines = cm.getRange(start, end, false);
        if (caseSensitive)
          lines.sort();
        else
          lines.sort(function(a, b) {
            var au = a.toUpperCase(), bu = b.toUpperCase();
            if (au != bu) { a = au; b = bu; }
            return a < b ? -1 : a == b ? 0 : 1;
          });
        cm.replaceRange(lines, start, end);
        if (selected) ranges.push({anchor: start, head: end});
      }
      if (selected) cm.setSelections(ranges, 0);
    });
  }

  cmds[map["F9"] = "sortLines"] = function(cm) { sortLines(cm, true); };
  cmds[map[ctrl + "F9"] = "sortLinesInsensitive"] = function(cm) { sortLines(cm, false); };

  cmds[map["F2"] = "nextBookmark"] = function(cm) {
    var marks = cm.state.sublimeBookmarks;
    if (marks) while (marks.length) {
      var current = marks.shift();
      var found = current.find();
      if (found) {
        marks.push(current);
        return cm.setSelection(found.from, found.to);
      }
    }
  };

  cmds[map["Shift-F2"] = "prevBookmark"] = function(cm) {
    var marks = cm.state.sublimeBookmarks;
    if (marks) while (marks.length) {
      marks.unshift(marks.pop());
      var found = marks[marks.length - 1].find();
      if (!found)
        marks.pop();
      else
        return cm.setSelection(found.from, found.to);
    }
  };

  cmds[map[ctrl + "F2"] = "toggleBookmark"] = function(cm) {
    var ranges = cm.listSelections();
    var marks = cm.state.sublimeBookmarks || (cm.state.sublimeBookmarks = []);
    for (var i = 0; i < ranges.length; i++) {
      var from = ranges[i].from(), to = ranges[i].to();
      var found = cm.findMarks(from, to);
      for (var j = 0; j < found.length; j++) {
        if (found[j].sublimeBookmark) {
          found[j].clear();
          for (var k = 0; k < marks.length; k++)
            if (marks[k] == found[j])
              marks.splice(k--, 1);
          break;
        }
      }
      if (j == found.length)
        marks.push(cm.markText(from, to, {sublimeBookmark: true, clearWhenEmpty: false}));
    }
  };

  cmds[map["Shift-" + ctrl + "F2"] = "clearBookmarks"] = function(cm) {
    var marks = cm.state.sublimeBookmarks;
    if (marks) for (var i = 0; i < marks.length; i++) marks[i].clear();
    marks.length = 0;
  };

  cmds[map["Alt-F2"] = "selectBookmarks"] = function(cm) {
    var marks = cm.state.sublimeBookmarks, ranges = [];
    if (marks) for (var i = 0; i < marks.length; i++) {
      var found = marks[i].find();
      if (!found)
        marks.splice(i--, 0);
      else
        ranges.push({anchor: found.from, head: found.to});
    }
    if (ranges.length)
      cm.setSelections(ranges, 0);
  };

  map["Alt-Q"] = "wrapLines";

  var mapK = CodeMirror.keyMap["sublime-Ctrl-K"] = {auto: "sublime", nofallthrough: true};

  map[ctrl + "K"] = function(cm) {cm.setOption("keyMap", "sublime-Ctrl-K");};

  function modifyWordOrSelection(cm, mod) {
    cm.operation(function() {
      var ranges = cm.listSelections(), indices = [], replacements = [];
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (range.empty()) { indices.push(i); replacements.push(""); }
        else replacements.push(mod(cm.getRange(range.from(), range.to())));
      }
      cm.replaceSelections(replacements, "around", "case");
      for (var i = indices.length - 1, at; i >= 0; i--) {
        var range = ranges[indices[i]];
        if (at && CodeMirror.cmpPos(range.head, at) > 0) continue;
        var word = wordAt(cm, range.head);
        at = word.from;
        cm.replaceRange(mod(word.word), word.from, word.to);
      }
    });
  }

  cmds[mapK[ctrl + "U"] = "upcaseAtCursor"] = function(cm) {
    modifyWordOrSelection(cm, function(str) { return str.toUpperCase(); });
  };
  cmds[mapK[ctrl + "L"] = "downcaseAtCursor"] = function(cm) {
    modifyWordOrSelection(cm, function(str) { return str.toLowerCase(); });
  };

  cmds[mapK[ctrl + "Space"] = "setSublimeMark"] = function(cm) {
    if (cm.state.sublimeMark) cm.state.sublimeMark.clear();
    cm.state.sublimeMark = cm.setBookmark(cm.getCursor());
  };
  cmds[mapK[ctrl + "A"] = "selectToSublimeMark"] = function(cm) {
    var found = cm.state.sublimeMark && cm.state.sublimeMark.find();
    if (found) cm.setSelection(cm.getCursor(), found);
  };
  cmds[mapK[ctrl + "W"] = "deleteToSublimeMark"] = function(cm) {
    var found = cm.state.sublimeMark && cm.state.sublimeMark.find();
    if (found) {
      var from = cm.getCursor(), to = found;
      if (CodeMirror.cmpPos(from, to) > 0) { var tmp = to; to = from; from = tmp; }
      cm.state.sublimeKilled = cm.getRange(from, to);
      cm.replaceRange("", from, to);
    }
  };
  cmds[mapK[ctrl + "X"] = "swapWithSublimeMark"] = function(cm) {
    var found = cm.state.sublimeMark && cm.state.sublimeMark.find();
    if (found) {
      cm.state.sublimeMark.clear();
      cm.state.sublimeMark = cm.setBookmark(cm.getCursor());
      cm.setCursor(found);
    }
  };
  cmds[mapK[ctrl + "Y"] = "sublimeYank"] = function(cm) {
    if (cm.state.sublimeKilled != null)
      cm.replaceSelection(cm.state.sublimeKilled, null, "paste");
  };

  mapK[ctrl + "G"] = "clearBookmarks";
  cmds[mapK[ctrl + "C"] = "showInCenter"] = function(cm) {
    var pos = cm.cursorCoords(null, "local");
    cm.scrollTo(null, (pos.top + pos.bottom) / 2 - cm.getScrollInfo().clientHeight / 2);
  };

  cmds[map["Shift-Alt-Up"] = "selectLinesUpward"] = function(cm) {
    cm.operation(function() {
      var ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (range.head.line > cm.firstLine())
          cm.addSelection(Pos(range.head.line - 1, range.head.ch));
      }
    });
  };
  cmds[map["Shift-Alt-Down"] = "selectLinesDownward"] = function(cm) {
    cm.operation(function() {
      var ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        if (range.head.line < cm.lastLine())
          cm.addSelection(Pos(range.head.line + 1, range.head.ch));
      }
    });
  };

  map["Shift-" + ctrl + "["] = "fold";
  map["Shift-" + ctrl + "]"] = "unfold";
  mapK[ctrl + "0"] = mapK[ctrl + "j"] = "unfoldAll";

  map[ctrl + "I"] = "findIncremental";
  map["Shift-" + ctrl + "I"] = "findIncrementalReverse";
  map[ctrl + "H"] = "replace";
  map["F3"] = "findNext";
  map["Shift-F3"] = "findPrev";

});
