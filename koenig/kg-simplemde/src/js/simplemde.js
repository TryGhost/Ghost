/*global require,module*/
"use strict";
var CodeMirror = require("codemirror");
require("codemirror/addon/edit/continuelist.js");
require("./codemirror/tablist");
require("codemirror/addon/display/fullscreen.js");
require("codemirror/mode/markdown/markdown.js");
require("codemirror/addon/mode/overlay.js");
require("codemirror/mode/gfm/gfm.js");
require("codemirror/mode/xml/xml.js");
require("spell-checker");
var marked = require("marked");


// Some variables
var isMac = /Mac/.test(navigator.platform);

var shortcuts = {
	"Cmd-B": toggleBold,
	"Cmd-I": toggleItalic,
	"Cmd-K": drawLink,
	"Cmd-H": toggleHeadingSmaller,
	"Shift-Cmd-H": toggleHeadingBigger,
	"Cmd-Alt-I": drawImage,
	"Cmd-'": toggleBlockquote,
	"Cmd-Alt-L": toggleOrderedList,
	"Cmd-L": toggleUnorderedList,
	"Cmd-Alt-C": toggleCodeBlock,
	"Cmd-P": togglePreview
};

var isMobile = function() {
	var check = false;
	(function(a) {
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
	})(navigator.userAgent || navigator.vendor || window.opera);
	return check;
};


/**
 * Fix shortcut. Mac use Command, others use Ctrl.
 */
function fixShortcut(name) {
	if(isMac) {
		name = name.replace("Ctrl", "Cmd");
	} else {
		name = name.replace("Cmd", "Ctrl");
	}
	return name;
}


/**
 * Create icon element for toolbar.
 */
function createIcon(options, enableTooltips) {
	options = options || {};
	var el = document.createElement("a");
	enableTooltips = (enableTooltips == undefined) ? true : enableTooltips;

	if(options.title && enableTooltips) {
		el.title = options.title;

		if(isMac) {
			el.title = el.title.replace("Ctrl", "⌘");
			el.title = el.title.replace("Alt", "⌥");
		}
	}

	el.tabIndex = -1;
	el.className = options.className;
	return el;
}

function createSep() {
	var el = document.createElement("i");
	el.className = "separator";
	el.innerHTML = "|";
	return el;
}


/**
 * The state of CodeMirror at the given position.
 */
function getState(cm, pos) {
	pos = pos || cm.getCursor("start");
	var stat = cm.getTokenAt(pos);
	if(!stat.type) return {};

	var types = stat.type.split(" ");

	var ret = {},
		data, text;
	for(var i = 0; i < types.length; i++) {
		data = types[i];
		if(data === "strong") {
			ret.bold = true;
		} else if(data === "variable-2") {
			text = cm.getLine(pos.line);
			if(/^\s*\d+\.\s/.test(text)) {
				ret["ordered-list"] = true;
			} else {
				ret["unordered-list"] = true;
			}
		} else if(data === "atom") {
			ret.quote = true;
		} else if(data === "em") {
			ret.italic = true;
		} else if(data === "quote") {
			ret.quote = true;
		} else if(data === "strikethrough") {
			ret.strikethrough = true;
		} else if(data === "comment") {
			ret.code = true;
		}
	}
	return ret;
}


// Saved overflow setting
var saved_overflow = "";

/**
 * Toggle full screen of the editor.
 */
function toggleFullScreen(editor) {
	// Set fullscreen
	var cm = editor.codemirror;
	cm.setOption("fullScreen", !cm.getOption("fullScreen"));


	// Prevent scrolling on body during fullscreen active
	if(cm.getOption("fullScreen")) {
		saved_overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
	} else {
		document.body.style.overflow = saved_overflow;
	}


	// Update toolbar class
	var wrap = cm.getWrapperElement();

	if(!/fullscreen/.test(wrap.previousSibling.className)) {
		wrap.previousSibling.className += " fullscreen";
	} else {
		wrap.previousSibling.className = wrap.previousSibling.className.replace(/\s*fullscreen\b/, "");
	}


	// Update toolbar button
	var toolbarButton = editor.toolbarElements.fullscreen;

	if(!/active/.test(toolbarButton.className)) {
		toolbarButton.className += " active";
	} else {
		toolbarButton.className = toolbarButton.className.replace(/\s*active\s*/g, "");
	}


	// Hide side by side if needed
	var sidebyside = cm.getWrapperElement().nextSibling;
	if(/editor-preview-active-side/.test(sidebyside.className))
		toggleSideBySide(editor);
}


/**
 * Action for toggling bold.
 */
function toggleBold(editor) {
	_toggleBlock(editor, "bold", editor.options.blockStyles.bold);
}


/**
 * Action for toggling italic.
 */
function toggleItalic(editor) {
	_toggleBlock(editor, "italic", editor.options.blockStyles.italic);
}


/**
 * Action for toggling strikethrough.
 */
function toggleStrikethrough(editor) {
	_toggleBlock(editor, "strikethrough", "~~");
}

/**
 * Action for toggling code block.
 */
function toggleCodeBlock(editor) {
	_toggleBlock(editor, "code", "```\r\n", "\r\n```");
}

/**
 * Action for toggling blockquote.
 */
function toggleBlockquote(editor) {
	var cm = editor.codemirror;
	_toggleLine(cm, "quote");
}

/**
 * Action for toggling heading size: normal -> h1 -> h2 -> h3 -> h4 -> h5 -> h6 -> normal
 */
function toggleHeadingSmaller(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, "smaller");
}

/**
 * Action for toggling heading size: normal -> h6 -> h5 -> h4 -> h3 -> h2 -> h1 -> normal
 */
function toggleHeadingBigger(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, "bigger");
}

/**
 * Action for toggling heading size 1
 */
function toggleHeading1(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, undefined, 1);
}

/**
 * Action for toggling heading size 2
 */
function toggleHeading2(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, undefined, 2);
}

/**
 * Action for toggling heading size 3
 */
function toggleHeading3(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, undefined, 3);
}


/**
 * Action for toggling ul.
 */
function toggleUnorderedList(editor) {
	var cm = editor.codemirror;
	_toggleLine(cm, "unordered-list");
}


/**
 * Action for toggling ol.
 */
function toggleOrderedList(editor) {
	var cm = editor.codemirror;
	_toggleLine(cm, "ordered-list");
}

/**
 * Action for drawing a link.
 */
function drawLink(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	var options = editor.options;
	_replaceSelection(cm, stat.link, options.insertTexts.link);
}

/**
 * Action for drawing an img.
 */
function drawImage(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	var options = editor.options;
	_replaceSelection(cm, stat.image, options.insertTexts.image);
}

/**
 * Action for drawing a table.
 */
function drawTable(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	var options = editor.options;
	_replaceSelection(cm, stat.table, options.insertTexts.table);
}

/**
 * Action for drawing a horizontal rule.
 */
function drawHorizontalRule(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	var options = editor.options;
	_replaceSelection(cm, stat.image, options.insertTexts.horizontalRule);
}


/**
 * Undo action.
 */
function undo(editor) {
	var cm = editor.codemirror;
	cm.undo();
	cm.focus();
}


/**
 * Redo action.
 */
function redo(editor) {
	var cm = editor.codemirror;
	cm.redo();
	cm.focus();
}


/**
 * Toggle side by side preview
 */
function toggleSideBySide(editor) {
	var cm = editor.codemirror;
	var wrapper = cm.getWrapperElement();
	var preview = wrapper.nextSibling;
	var toolbarButton = editor.toolbarElements["side-by-side"];

	if(/editor-preview-active-side/.test(preview.className)) {
		preview.className = preview.className.replace(
			/\s*editor-preview-active-side\s*/g, ""
		);
		toolbarButton.className = toolbarButton.className.replace(/\s*active\s*/g, "");
		wrapper.className = wrapper.className.replace(/\s*CodeMirror-sided\s*/g, " ");
	} else {
		// When the preview button is clicked for the first time,
		// give some time for the transition from editor.css to fire and the view to slide from right to left,
		// instead of just appearing.
		setTimeout(function() {
			if(!cm.getOption("fullScreen"))
				toggleFullScreen(editor);
			preview.className += " editor-preview-active-side";
		}, 1);
		toolbarButton.className += " active";
		wrapper.className += " CodeMirror-sided";
	}

	// Hide normal preview if active
	var previewNormal = wrapper.lastChild;
	if(/editor-preview-active/.test(previewNormal.className)) {
		previewNormal.className = previewNormal.className.replace(
			/\s*editor-preview-active\s*/g, ""
		);
		var toolbar = editor.toolbarElements.preview;
		var toolbar_div = wrapper.previousSibling;
		toolbar.className = toolbar.className.replace(/\s*active\s*/g, "");
		toolbar_div.className = toolbar_div.className.replace(/\s*disabled-for-preview*/g, "");
	}

	// Start preview with the current text
	preview.innerHTML = editor.options.previewRender(editor.value(), preview);

	// Updates preview
	cm.on("update", function() {
		preview.innerHTML = editor.options.previewRender(editor.value(), preview);
	});
}


/**
 * Preview action.
 */
function togglePreview(editor) {
	var cm = editor.codemirror;
	var wrapper = cm.getWrapperElement();
	var toolbar_div = wrapper.previousSibling;
	var toolbar = editor.toolbarElements.preview;
	var preview = wrapper.lastChild;
	if(!preview || !/editor-preview/.test(preview.className)) {
		preview = document.createElement("div");
		preview.className = "editor-preview";
		wrapper.appendChild(preview);
	}
	if(/editor-preview-active/.test(preview.className)) {
		preview.className = preview.className.replace(
			/\s*editor-preview-active\s*/g, ""
		);
		toolbar.className = toolbar.className.replace(/\s*active\s*/g, "");
		toolbar_div.className = toolbar_div.className.replace(/\s*disabled-for-preview*/g, "");
	} else {
		// When the preview button is clicked for the first time,
		// give some time for the transition from editor.css to fire and the view to slide from right to left,
		// instead of just appearing.
		setTimeout(function() {
			preview.className += " editor-preview-active";
		}, 1);
		toolbar.className += " active";
		toolbar_div.className += " disabled-for-preview";
	}
	preview.innerHTML = editor.options.previewRender(editor.value(), preview);

	// Turn off side by side if needed
	var sidebyside = cm.getWrapperElement().nextSibling;
	if(/editor-preview-active-side/.test(sidebyside.className))
		toggleSideBySide(editor);
}

function _replaceSelection(cm, active, startEnd) {
	if(/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
		return;

	var text;
	var start = startEnd[0];
	var end = startEnd[1];
	var startPoint = cm.getCursor("start");
	var endPoint = cm.getCursor("end");
	if(active) {
		text = cm.getLine(startPoint.line);
		start = text.slice(0, startPoint.ch);
		end = text.slice(startPoint.ch);
		cm.replaceRange(start + end, {
			line: startPoint.line,
			ch: 0
		});
	} else {
		text = cm.getSelection();
		cm.replaceSelection(start + text + end);

		startPoint.ch += start.length;
		if(startPoint !== endPoint) {
			endPoint.ch += start.length;
		}
	}
	cm.setSelection(startPoint, endPoint);
	cm.focus();
}


function _toggleHeading(cm, direction, size) {
	if(/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
		return;

	var startPoint = cm.getCursor("start");
	var endPoint = cm.getCursor("end");
	for(var i = startPoint.line; i <= endPoint.line; i++) {
		(function(i) {
			var text = cm.getLine(i);
			var currHeadingLevel = text.search(/[^#]/);

			if(direction !== undefined) {
				if(currHeadingLevel <= 0) {
					if(direction == "bigger") {
						text = "###### " + text;
					} else {
						text = "# " + text;
					}
				} else if(currHeadingLevel == 6 && direction == "smaller") {
					text = text.substr(7);
				} else if(currHeadingLevel == 1 && direction == "bigger") {
					text = text.substr(2);
				} else {
					if(direction == "bigger") {
						text = text.substr(1);
					} else {
						text = "#" + text;
					}
				}
			} else {
				if(size == 1) {
					if(currHeadingLevel <= 0) {
						text = "# " + text;
					} else if(currHeadingLevel == size) {
						text = text.substr(currHeadingLevel + 1);
					} else {
						text = "# " + text.substr(currHeadingLevel + 1);
					}
				} else if(size == 2) {
					if(currHeadingLevel <= 0) {
						text = "## " + text;
					} else if(currHeadingLevel == size) {
						text = text.substr(currHeadingLevel + 1);
					} else {
						text = "## " + text.substr(currHeadingLevel + 1);
					}
				} else {
					if(currHeadingLevel <= 0) {
						text = "### " + text;
					} else if(currHeadingLevel == size) {
						text = text.substr(currHeadingLevel + 1);
					} else {
						text = "### " + text.substr(currHeadingLevel + 1);
					}
				}
			}

			cm.replaceRange(text, {
				line: i,
				ch: 0
			}, {
				line: i,
				ch: 99999999999999
			});
		})(i);
	}
	cm.focus();
}


function _toggleLine(cm, name) {
	if(/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
		return;

	var stat = getState(cm);
	var startPoint = cm.getCursor("start");
	var endPoint = cm.getCursor("end");
	var repl = {
		"quote": /^(\s*)\>\s+/,
		"unordered-list": /^(\s*)(\*|\-|\+)\s+/,
		"ordered-list": /^(\s*)\d+\.\s+/
	};
	var map = {
		"quote": "> ",
		"unordered-list": "* ",
		"ordered-list": "1. "
	};
	for(var i = startPoint.line; i <= endPoint.line; i++) {
		(function(i) {
			var text = cm.getLine(i);
			if(stat[name]) {
				text = text.replace(repl[name], "$1");
			} else {
				text = map[name] + text;
			}
			cm.replaceRange(text, {
				line: i,
				ch: 0
			}, {
				line: i,
				ch: 99999999999999
			});
		})(i);
	}
	cm.focus();
}

function _toggleBlock(editor, type, start_chars, end_chars) {
	if(/editor-preview-active/.test(editor.codemirror.getWrapperElement().lastChild.className))
		return;

	end_chars = (typeof end_chars === "undefined") ? start_chars : end_chars;
	var cm = editor.codemirror;
	var stat = getState(cm);

	var text;
	var start = start_chars;
	var end = end_chars;

	var startPoint = cm.getCursor("start");
	var endPoint = cm.getCursor("end");

	if(stat[type]) {
		text = cm.getLine(startPoint.line);
		start = text.slice(0, startPoint.ch);
		end = text.slice(startPoint.ch);
		if(type == "bold") {
			start = start.replace(/(\*\*|__)(?![\s\S]*(\*\*|__))/, "");
			end = end.replace(/(\*\*|__)/, "");
		} else if(type == "italic") {
			start = start.replace(/(\*|_)(?![\s\S]*(\*|_))/, "");
			end = end.replace(/(\*|_)/, "");
		} else if(type == "strikethrough") {
			start = start.replace(/(\*\*|~~)(?![\s\S]*(\*\*|~~))/, "");
			end = end.replace(/(\*\*|~~)/, "");
		}
		cm.replaceRange(start + end, {
			line: startPoint.line,
			ch: 0
		}, {
			line: startPoint.line,
			ch: 99999999999999
		});

		if(type == "bold" || type == "strikethrough") {
			startPoint.ch -= 2;
			if(startPoint !== endPoint) {
				endPoint.ch -= 2;
			}
		} else if(type == "italic") {
			startPoint.ch -= 1;
			if(startPoint !== endPoint) {
				endPoint.ch -= 1;
			}
		}
	} else {
		text = cm.getSelection();
		if(type == "bold") {
			text = text.split("**").join("");
			text = text.split("__").join("");
		} else if(type == "italic") {
			text = text.split("*").join("");
			text = text.split("_").join("");
		} else if(type == "strikethrough") {
			text = text.split("~~").join("");
		}
		cm.replaceSelection(start + text + end);

		startPoint.ch += start_chars.length;
		endPoint.ch = startPoint.ch + text.length;
	}

	cm.setSelection(startPoint, endPoint);
	cm.focus();
}

// Merge the properties of one object into another.
function _mergeProperties(target, source) {
	for(var property in source) {
		if(source.hasOwnProperty(property)) {
			if(source[property] instanceof Array) {
				target[property] = source[property].concat(target[property] instanceof Array ? target[property] : []);
			} else if(
				source[property] !== null &&
				typeof source[property] === "object" &&
				source[property].constructor === Object
			) {
				target[property] = _mergeProperties(target[property] || {}, source[property]);
			} else {
				target[property] = source[property];
			}
		}
	}

	return target;
}

// Merge an arbitrary number of objects into one.
function extend(target) {
	for(var i = 1; i < arguments.length; i++) {
		target = _mergeProperties(target, arguments[i]);
	}

	return target;
}

/* The right word count in respect for CJK. */
function wordCount(data) {
	var pattern = /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
	var m = data.match(pattern);
	var count = 0;
	if(m === null) return count;
	for(var i = 0; i < m.length; i++) {
		if(m[i].charCodeAt(0) >= 0x4E00) {
			count += m[i].length;
		} else {
			count += 1;
		}
	}
	return count;
}

var toolbarBuiltInButtons = {
	"bold": {
		name: "bold",
		action: toggleBold,
		className: "fa fa-bold",
		title: "Bold (Ctrl+B)",
		default: true
	},
	"italic": {
		name: "italic",
		action: toggleItalic,
		className: "fa fa-italic",
		title: "Italic (Ctrl+I)",
		default: true
	},
	"strikethrough": {
		name: "strikethrough",
		action: toggleStrikethrough,
		className: "fa fa-strikethrough",
		title: "Strikethrough"
	},
	"heading": {
		name: "heading",
		action: toggleHeadingSmaller,
		className: "fa fa-header",
		title: "Heading (Ctrl+H)",
		default: true
	},
	"heading-smaller": {
		name: "heading-smaller",
		action: toggleHeadingSmaller,
		className: "fa fa-header fa-header-x fa-header-smaller",
		title: "Smaller Heading (Ctrl+H)"
	},
	"heading-bigger": {
		name: "heading-bigger",
		action: toggleHeadingBigger,
		className: "fa fa-header fa-header-x fa-header-bigger",
		title: "Bigger Heading (Shift+Ctrl+H)"
	},
	"heading-1": {
		name: "heading-1",
		action: toggleHeading1,
		className: "fa fa-header fa-header-x fa-header-1",
		title: "Big Heading"
	},
	"heading-2": {
		name: "heading-2",
		action: toggleHeading2,
		className: "fa fa-header fa-header-x fa-header-2",
		title: "Medium Heading"
	},
	"heading-3": {
		name: "heading-3",
		action: toggleHeading3,
		className: "fa fa-header fa-header-x fa-header-3",
		title: "Small Heading"
	},
	"separator-1": {
		name: "separator-1"
	},
	"code": {
		name: "code",
		action: toggleCodeBlock,
		className: "fa fa-code",
		title: "Code (Ctrl+Alt+C)"
	},
	"quote": {
		name: "quote",
		action: toggleBlockquote,
		className: "fa fa-quote-left",
		title: "Quote (Ctrl+')",
		default: true
	},
	"unordered-list": {
		name: "unordered-list",
		action: toggleUnorderedList,
		className: "fa fa-list-ul",
		title: "Generic List (Ctrl+L)",
		default: true
	},
	"ordered-list": {
		name: "ordered-list",
		action: toggleOrderedList,
		className: "fa fa-list-ol",
		title: "Numbered List (Ctrl+Alt+L)",
		default: true
	},
	"separator-2": {
		name: "separator-2"
	},
	"link": {
		name: "link",
		action: drawLink,
		className: "fa fa-link",
		title: "Create Link (Ctrl+K)",
		default: true
	},
	"image": {
		name: "image",
		action: drawImage,
		className: "fa fa-picture-o",
		title: "Insert Image (Ctrl+Alt+I)",
		default: true
	},
	"table": {
		name: "table",
		action: drawTable,
		className: "fa fa-table",
		title: "Insert Table"
	},
	"horizontal-rule": {
		name: "horizontal-rule",
		action: drawHorizontalRule,
		className: "fa fa-minus",
		title: "Insert Horizontal Line"
	},
	"separator-3": {
		name: "separator-3"
	},
	"preview": {
		name: "preview",
		action: togglePreview,
		className: "fa fa-eye no-disable",
		title: "Toggle Preview (Ctrl+P)",
		default: true
	},
	"side-by-side": {
		name: "side-by-side",
		action: toggleSideBySide,
		className: "fa fa-columns no-disable no-mobile",
		title: "Toggle Side by Side (F9)",
		default: true
	},
	"fullscreen": {
		name: "fullscreen",
		action: toggleFullScreen,
		className: "fa fa-arrows-alt no-disable no-mobile",
		title: "Toggle Fullscreen (F11)",
		default: true
	},
	"guide": {
		name: "guide",
		action: "http://nextstepwebs.github.io/simplemde-markdown-editor/markdown-guide",
		className: "fa fa-question-circle",
		title: "Markdown Guide",
		default: true
	}
};

var insertTexts = {
	link: ["[", "](http://)"],
	image: ["![](http://", ")"],
	table: ["", "\n\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text      | Text     |\n\n"],
	horizontalRule: ["", "\n\n-----\n\n"]
};

var blockStyles = {
	"bold": "**",
	"italic": "*"
};

/**
 * Interface of SimpleMDE.
 */
function SimpleMDE(options) {
	// Handle options parameter
	options = options || {};


	// Used later to refer to it"s parent
	options.parent = this;


	// Check if Font Awesome needs to be auto downloaded
	var autoDownloadFA = true;

	if(options.autoDownloadFontAwesome === false) {
		autoDownloadFA = false;
	}

	if(options.autoDownloadFontAwesome !== true) {
		var styleSheets = document.styleSheets;
		for(var i = 0; i < styleSheets.length; i++) {
			if(!styleSheets[i].href)
				continue;

			if(styleSheets[i].href.indexOf("//maxcdn.bootstrapcdn.com/font-awesome/") > -1) {
				autoDownloadFA = false;
			}
		}
	}

	if(autoDownloadFA) {
		var link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css";
		document.getElementsByTagName("head")[0].appendChild(link);
	}


	// Find the textarea to use
	if(options.element) {
		this.element = options.element;
	} else if(options.element === null) {
		// This means that the element option was specified, but no element was found
		console.log("SimpleMDE: Error. No element was found.");
		return;
	}


	// Handle toolbar
	if(options.toolbar === undefined) {
		// Initialize
		options.toolbar = [];


		// Loop over the built in buttons, to get the preferred order
		for(var key in toolbarBuiltInButtons) {
			if(toolbarBuiltInButtons.hasOwnProperty(key)) {
				if(key.indexOf("separator-") != -1) {
					options.toolbar.push("|");
				}

				if(toolbarBuiltInButtons[key].default === true || (options.showIcons && options.showIcons.constructor === Array && options.showIcons.indexOf(key) != -1)) {
					options.toolbar.push(key);
				}
			}
		}
	}


	// Handle status bar
	if(!options.hasOwnProperty("status")) {
		options.status = ["autosave", "lines", "words", "cursor"];
	}


	// Add default preview rendering function
	if(!options.previewRender) {
		options.previewRender = function(plainText) {
			// Note: "this" refers to the options object
			return this.parent.markdown(plainText);
		};
	}


	// Set default options for parsing config
	options.parsingConfig = options.parsingConfig || {};


	// Merging the insertTexts, with the given options
	options.insertTexts = extend({}, insertTexts, options.insertTexts || {});


	// Merging the blockStyles, with the given options
	options.blockStyles = extend({}, blockStyles, options.blockStyles || {});


	// Change unique_id to uniqueId for backwards compatibility
	if(options.autosave != undefined && options.autosave.unique_id != undefined && options.autosave.unique_id != "")
		options.autosave.uniqueId = options.autosave.unique_id;


	// Update this options
	this.options = options;


	// Auto render
	this.render();


	// The codemirror component is only available after rendering
	// so, the setter for the initialValue can only run after
	// the element has been rendered
	if(options.initialValue && (!this.options.autosave || this.options.autosave.foundSavedValue !== true)) {
		this.value(options.initialValue);
	}
}

/**
 * Default markdown render.
 */
SimpleMDE.prototype.markdown = function(text) {
	if(marked) {
		// Initialize
		var markedOptions = {};


		// Update options
		if(this.options && this.options.renderingConfig && this.options.renderingConfig.singleLineBreaks !== false) {
			markedOptions.breaks = true;
		}

		if(this.options && this.options.renderingConfig && this.options.renderingConfig.codeSyntaxHighlighting === true && window.hljs) {
			markedOptions.highlight = function(code) {
				return window.hljs.highlightAuto(code).value;
			};
		}


		// Set options
		marked.setOptions(markedOptions);


		// Return
		return marked(text);
	}
};

/**
 * Render editor to the given element.
 */
SimpleMDE.prototype.render = function(el) {
	if(!el) {
		el = this.element || document.getElementsByTagName("textarea")[0];
	}

	if(this._rendered && this._rendered === el) {
		// Already rendered.
		return;
	}

	this.element = el;
	var options = this.options;

	var self = this;
	var keyMaps = {};

	for(var key in shortcuts) {
		(function(key) {
			keyMaps[fixShortcut(key)] = function() {
				shortcuts[key](self);
			};
		})(key);
	}

	keyMaps["Enter"] = "newlineAndIndentContinueMarkdownList";
	keyMaps["Tab"] = "tabAndIndentMarkdownList";
	keyMaps["Shift-Tab"] = "shiftTabAndUnindentMarkdownList";
	keyMaps["F11"] = function() {
		toggleFullScreen(self);
	};
	keyMaps["F9"] = function() {
		toggleSideBySide(self);
	};
	keyMaps["Esc"] = function(cm) {
		if(cm.getOption("fullScreen")) toggleFullScreen(self);
	};

	document.addEventListener("keydown", function(e) {
		e = e || window.event;

		if(e.keyCode == 27) {
			if(self.codemirror.getOption("fullScreen")) toggleFullScreen(self);
		}
	}, false);

	var mode, backdrop;
	if(options.spellChecker !== false) {
		mode = "spell-checker";
		backdrop = options.parsingConfig;
		backdrop.name = "gfm";
		backdrop.gitHubSpice = false;
	} else {
		mode = options.parsingConfig;
		mode.name = "gfm";
		mode.gitHubSpice = false;
	}

	this.codemirror = CodeMirror.fromTextArea(el, {
		mode: mode,
		backdrop: backdrop,
		theme: "paper",
		tabSize: (options.tabSize != undefined) ? options.tabSize : 2,
		indentUnit: (options.tabSize != undefined) ? options.tabSize : 2,
		indentWithTabs: (options.indentWithTabs === false) ? false : true,
		lineNumbers: false,
		autofocus: (options.autofocus === true) ? true : false,
		extraKeys: keyMaps,
		lineWrapping: (options.lineWrapping === false) ? false : true,
		allowDropFileTypes: ["text/plain"]
	});

	if(options.toolbar !== false) {
		this.createToolbar();
	}
	if(options.status !== false) {
		this.createStatusbar();
	}
	if(options.autosave != undefined && options.autosave.enabled === true) {
		this.autosave();
	}

	this.createSideBySide();

	this._rendered = this.element;
};

SimpleMDE.prototype.autosave = function() {
	if(localStorage) {
		var simplemde = this;

		if(this.options.autosave.uniqueId == undefined || this.options.autosave.uniqueId == "") {
			console.log("SimpleMDE: You must set a uniqueId to use the autosave feature");
			return;
		}

		if(simplemde.element.form != null && simplemde.element.form != undefined) {
			simplemde.element.form.addEventListener("submit", function() {
				localStorage.removeItem("smde_" + simplemde.options.autosave.uniqueId);
			});
		}

		if(this.options.autosave.loaded !== true) {
			if(typeof localStorage.getItem("smde_" + this.options.autosave.uniqueId) == "string" && localStorage.getItem("smde_" + this.options.autosave.uniqueId) != "") {
				this.codemirror.setValue(localStorage.getItem("smde_" + this.options.autosave.uniqueId));
				this.options.autosave.foundSavedValue = true;
			}

			this.options.autosave.loaded = true;
		}

		localStorage.setItem("smde_" + this.options.autosave.uniqueId, simplemde.value());

		var el = document.getElementById("autosaved");
		if(el != null && el != undefined && el != "") {
			var d = new Date();
			var hh = d.getHours();
			var m = d.getMinutes();
			var dd = "am";
			var h = hh;
			if(h >= 12) {
				h = hh - 12;
				dd = "pm";
			}
			if(h == 0) {
				h = 12;
			}
			m = m < 10 ? "0" + m : m;

			el.innerHTML = "Autosaved: " + h + ":" + m + " " + dd;
		}

		setTimeout(function() {
			simplemde.autosave();
		}, this.options.autosave.delay || 10000);
	} else {
		console.log("SimpleMDE: localStorage not available, cannot autosave");
	}
};

SimpleMDE.prototype.clearAutosavedValue = function() {
	if(localStorage) {
		if(this.options.autosave.uniqueId == undefined || this.options.autosave.uniqueId == "") {
			console.log("SimpleMDE: You must set a uniqueId to use the autosave feature");
			return;
		}

		localStorage.removeItem("smde_" + this.options.autosave.uniqueId);
	} else {
		console.log("SimpleMDE: localStorage not available, cannot autosave");
	}
};

SimpleMDE.prototype.createSideBySide = function() {
	var cm = this.codemirror;
	var wrapper = cm.getWrapperElement();
	var preview = wrapper.nextSibling;

	if(!preview || !/editor-preview-side/.test(preview.className)) {
		preview = document.createElement("div");
		preview.className = "editor-preview-side";
		wrapper.parentNode.insertBefore(preview, wrapper.nextSibling);
	}

	// Syncs scroll  editor -> preview
	var cScroll = false;
	var pScroll = false;
	cm.on("scroll", function(v) {
		if(cScroll) {
			cScroll = false;
			return;
		}
		pScroll = true;
		var height = v.getScrollInfo().height - v.getScrollInfo().clientHeight;
		var ratio = parseFloat(v.getScrollInfo().top) / height;
		var move = (preview.scrollHeight - preview.clientHeight) * ratio;
		preview.scrollTop = move;
	});

	// Syncs scroll  preview -> editor
	preview.onscroll = function() {
		if(pScroll) {
			pScroll = false;
			return;
		}
		cScroll = true;
		var height = preview.scrollHeight - preview.clientHeight;
		var ratio = parseFloat(preview.scrollTop) / height;
		var move = (cm.getScrollInfo().height - cm.getScrollInfo().clientHeight) * ratio;
		cm.scrollTo(0, move);
	};
	return true;
};

SimpleMDE.prototype.createToolbar = function(items) {
	items = items || this.options.toolbar;

	if(!items || items.length === 0) {
		return;
	}
	var i;
	for(i = 0; i < items.length; i++) {
		if(toolbarBuiltInButtons[items[i]] != undefined) {
			items[i] = toolbarBuiltInButtons[items[i]];
		}
	}

	var bar = document.createElement("div");
	bar.className = "editor-toolbar";

	var self = this;

	var toolbar_data = {};
	self.toolbar = items;

	for(i = 0; i < items.length; i++) {
		if(items[i].name == "guide" && self.options.toolbarGuideIcon === false)
			continue;

		if(self.options.hideIcons && self.options.hideIcons.indexOf(items[i].name) != -1)
			continue;

		// Fullscreen does not work well on mobile devices (even tablets)
		// In the future, hopefully this can be resolved
		if((items[i].name == "fullscreen" || items[i].name == "side-by-side") && isMobile())
			continue;

		(function(item) {
			var el;
			if(item === "|") {
				el = createSep();
			} else {
				el = createIcon(item, self.options.toolbarTips);
			}

			// bind events, special for info
			if(item.action) {
				if(typeof item.action === "function") {
					el.onclick = function() {
						item.action(self);
					};
				} else if(typeof item.action === "string") {
					el.href = item.action;
					el.target = "_blank";
				}
			}
			toolbar_data[item.name || item] = el;
			bar.appendChild(el);
		})(items[i]);
	}

	self.toolbarElements = toolbar_data;

	var cm = this.codemirror;
	cm.on("cursorActivity", function() {
		var stat = getState(cm);

		for(var key in toolbar_data) {
			(function(key) {
				var el = toolbar_data[key];
				if(stat[key]) {
					el.className += " active";
				} else if(key != "fullscreen" && key != "side-by-side") {
					el.className = el.className.replace(/\s*active\s*/g, "");
				}
			})(key);
		}
	});

	var cmWrapper = cm.getWrapperElement();
	cmWrapper.parentNode.insertBefore(bar, cmWrapper);
	return bar;
};

SimpleMDE.prototype.createStatusbar = function(status) {
	status = status || this.options.status;
	var options = this.options;

	if(!status || status.length === 0) return;

	var bar = document.createElement("div");
	bar.className = "editor-statusbar";

	var pos, cm = this.codemirror;
	for(var i = 0; i < status.length; i++) {
		(function(name) {
			var el = document.createElement("span");
			el.className = name;
			if(name === "words") {
				el.innerHTML = "0";
				cm.on("update", function() {
					el.innerHTML = wordCount(cm.getValue());
				});
			} else if(name === "lines") {
				el.innerHTML = "0";
				cm.on("update", function() {
					el.innerHTML = cm.lineCount();
				});
			} else if(name === "cursor") {
				el.innerHTML = "0:0";
				cm.on("cursorActivity", function() {
					pos = cm.getCursor();
					el.innerHTML = pos.line + ":" + pos.ch;
				});
			} else if(name === "autosave") {
				if(options.autosave != undefined && options.autosave.enabled === true) {
					el.setAttribute("id", "autosaved");
				}
			}
			bar.appendChild(el);
		})(status[i]);
	}

	var cmWrapper = this.codemirror.getWrapperElement();
	cmWrapper.parentNode.insertBefore(bar, cmWrapper.nextSibling);
	return bar;
};

/**
 * Get or set the text content.
 */
SimpleMDE.prototype.value = function(val) {
	if(val === undefined) {
		return this.codemirror.getValue();
	} else {
		this.codemirror.getDoc().setValue(val);
		return this;
	}
};


/**
 * Bind static methods for exports.
 */
SimpleMDE.toggleBold = toggleBold;
SimpleMDE.toggleItalic = toggleItalic;
SimpleMDE.toggleStrikethrough = toggleStrikethrough;
SimpleMDE.toggleBlockquote = toggleBlockquote;
SimpleMDE.toggleHeadingSmaller = toggleHeadingSmaller;
SimpleMDE.toggleHeadingBigger = toggleHeadingBigger;
SimpleMDE.toggleHeading1 = toggleHeading1;
SimpleMDE.toggleHeading2 = toggleHeading2;
SimpleMDE.toggleHeading3 = toggleHeading3;
SimpleMDE.toggleCodeBlock = toggleCodeBlock;
SimpleMDE.toggleUnorderedList = toggleUnorderedList;
SimpleMDE.toggleOrderedList = toggleOrderedList;
SimpleMDE.drawLink = drawLink;
SimpleMDE.drawImage = drawImage;
SimpleMDE.drawTable = drawTable;
SimpleMDE.drawHorizontalRule = drawHorizontalRule;
SimpleMDE.undo = undo;
SimpleMDE.redo = redo;
SimpleMDE.togglePreview = togglePreview;
SimpleMDE.toggleSideBySide = toggleSideBySide;
SimpleMDE.toggleFullScreen = toggleFullScreen;

/**
 * Bind instance methods for exports.
 */
SimpleMDE.prototype.toggleBold = function() {
	toggleBold(this);
};
SimpleMDE.prototype.toggleItalic = function() {
	toggleItalic(this);
};
SimpleMDE.prototype.toggleStrikethrough = function() {
	toggleStrikethrough(this);
};
SimpleMDE.prototype.toggleBlockquote = function() {
	toggleBlockquote(this);
};
SimpleMDE.prototype.toggleHeadingSmaller = function() {
	toggleHeadingSmaller(this);
};
SimpleMDE.prototype.toggleHeadingBigger = function() {
	toggleHeadingBigger(this);
};
SimpleMDE.prototype.toggleHeading1 = function() {
	toggleHeading1(this);
};
SimpleMDE.prototype.toggleHeading2 = function() {
	toggleHeading2(this);
};
SimpleMDE.prototype.toggleHeading3 = function() {
	toggleHeading3(this);
};
SimpleMDE.prototype.toggleCodeBlock = function() {
	toggleCodeBlock(this);
};
SimpleMDE.prototype.toggleUnorderedList = function() {
	toggleUnorderedList(this);
};
SimpleMDE.prototype.toggleOrderedList = function() {
	toggleOrderedList(this);
};
SimpleMDE.prototype.drawLink = function() {
	drawLink(this);
};
SimpleMDE.prototype.drawImage = function() {
	drawImage(this);
};
SimpleMDE.prototype.drawTable = function() {
	drawTable(this);
};
SimpleMDE.prototype.drawHorizontalRule = function() {
	drawHorizontalRule(this);
};
SimpleMDE.prototype.undo = function() {
	undo(this);
};
SimpleMDE.prototype.redo = function() {
	redo(this);
};
SimpleMDE.prototype.togglePreview = function() {
	togglePreview(this);
};
SimpleMDE.prototype.toggleSideBySide = function() {
	toggleSideBySide(this);
};
SimpleMDE.prototype.toggleFullScreen = function() {
	toggleFullScreen(this);
};

SimpleMDE.prototype.isPreviewActive = function() {
	var cm = this.codemirror;
	var wrapper = cm.getWrapperElement();
	var preview = wrapper.lastChild;

	return /editor-preview-active/.test(preview.className);
};

SimpleMDE.prototype.isSideBySideActive = function() {
	var cm = this.codemirror;
	var wrapper = cm.getWrapperElement();
	var preview = wrapper.nextSibling;

	return /editor-preview-active-side/.test(preview.className);
};

SimpleMDE.prototype.isFullscreenActive = function() {
	var cm = this.codemirror;

	return cm.getOption("fullScreen");
};

module.exports = SimpleMDE;
