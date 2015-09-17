var isMac = /Mac/.test(navigator.platform);

var shortcuts = {
	'Cmd-B': toggleBold,
	'Cmd-I': toggleItalic,
	'Cmd-K': drawLink,
	'Cmd-H': toggleHeadingSmaller,
	'Shift-Cmd-H': toggleHeadingBigger,
	'Cmd-Alt-I': drawImage,
	"Cmd-'": toggleBlockquote,
	'Cmd-Alt-L': toggleOrderedList,
	'Cmd-L': toggleUnorderedList,
	'Cmd-Alt-C': toggleCodeBlock,
	'Cmd-P': togglePreview,
};


/**
 * Fix shortcut. Mac use Command, others use Ctrl.
 */
function fixShortcut(name) {
	if(isMac) {
		name = name.replace('Ctrl', 'Cmd');
	} else {
		name = name.replace('Cmd', 'Ctrl');
	}
	return name;
}


/**
 * Create icon element for toolbar.
 */
function createIcon(options, enableTooltips) {
	options = options || {};
	var el = document.createElement('a');
	enableTooltips = (enableTooltips == undefined) ? true : enableTooltips;

	if(options.title && enableTooltips) {
		el.title = options.title;

		if(isMac) {
			el.title = el.title.replace('Ctrl', '⌘');
			el.title = el.title.replace('Alt', '⌥');
		}
	}

	el.className = options.className;
	return el;
}

function createSep() {
	el = document.createElement('i');
	el.className = 'separator';
	el.innerHTML = '|';
	return el;
}


/**
 * The state of CodeMirror at the given position.
 */
function getState(cm, pos) {
	pos = pos || cm.getCursor('start');
	var stat = cm.getTokenAt(pos);
	if(!stat.type) return {};

	var types = stat.type.split(' ');

	var ret = {},
		data, text;
	for(var i = 0; i < types.length; i++) {
		data = types[i];
		if(data === 'strong') {
			ret.bold = true;
		} else if(data === 'variable-2') {
			text = cm.getLine(pos.line);
			if(/^\s*\d+\.\s/.test(text)) {
				ret['ordered-list'] = true;
			} else {
				ret['unordered-list'] = true;
			}
		} else if(data === 'atom') {
			ret.quote = true;
		} else if(data === 'em') {
			ret.italic = true;
		} else if(data === 'quote') {
			ret.quote = true;
		} else if(data === 'strikethrough') {
			ret.strikethrough = true;
		} else if(data === 'comment') {
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
		toolbarButton.className = toolbarButton.className.replace(/\s*active\s*/g, '');
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
	_toggleBlock(editor, 'bold', '**');
}


/**
 * Action for toggling italic.
 */
function toggleItalic(editor) {
	_toggleBlock(editor, 'italic', '*');
}


/**
 * Action for toggling strikethrough.
 */
function toggleStrikethrough(editor) {
	_toggleBlock(editor, 'strikethrough', '~~');
}

/**
 * Action for toggling code block.
 */
function toggleCodeBlock(editor) {
	_toggleBlock(editor, 'code', '```\r\n', '\r\n```');
}

/**
 * Action for toggling blockquote.
 */
function toggleBlockquote(editor) {
	var cm = editor.codemirror;
	_toggleLine(cm, 'quote');
}

/**
 * Action for toggling heading size: normal -> h1 -> h2 -> h3 -> h4 -> h5 -> h6 -> normal
 */
function toggleHeadingSmaller(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, 'smaller');
}

/**
 * Action for toggling heading size: normal -> h6 -> h5 -> h4 -> h3 -> h2 -> h1 -> normal
 */
function toggleHeadingBigger(editor) {
	var cm = editor.codemirror;
	_toggleHeading(cm, 'bigger');
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
	_toggleLine(cm, 'unordered-list');
}


/**
 * Action for toggling ol.
 */
function toggleOrderedList(editor) {
	var cm = editor.codemirror;
	_toggleLine(cm, 'ordered-list');
}


/**
 * Action for drawing a link.
 */
function drawLink(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	_replaceSelection(cm, stat.link, '[', '](http://)');
}


/**
 * Action for drawing an img.
 */
function drawImage(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	_replaceSelection(cm, stat.image, '![](http://', ')');
}


/**
 * Action for drawing a horizontal rule.
 */
function drawHorizontalRule(editor) {
	var cm = editor.codemirror;
	var stat = getState(cm);
	_replaceSelection(cm, stat.image, '', '\n\n-----\n\n');
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
	var code = wrapper.firstChild;
	var preview = wrapper.nextSibling;
	var toolbarButton = editor.toolbarElements["side-by-side"];

	if(/editor-preview-active-side/.test(preview.className)) {
		preview.className = preview.className.replace(
			/\s*editor-preview-active-side\s*/g, ''
		);
		toolbarButton.className = toolbarButton.className.replace(/\s*active\s*/g, '');
		wrapper.className = wrapper.className.replace(/\s*CodeMirror-sided\s*/g, ' ');
	} else {
		/* When the preview button is clicked for the first time,
		 * give some time for the transition from editor.css to fire and the view to slide from right to left,
		 * instead of just appearing.
		 */
		setTimeout(function() {
			if(!cm.getOption("fullScreen")) toggleFullScreen(editor);
			preview.className += ' editor-preview-active-side'
		}, 1);
		toolbarButton.className += ' active';
		wrapper.className += ' CodeMirror-sided';
	}

	// Hide normal preview if active
	var previewNormal = wrapper.lastChild;
	if(/editor-preview-active/.test(previewNormal.className)) {
		previewNormal.className = previewNormal.className.replace(
			/\s*editor-preview-active\s*/g, ''
		);
		var toolbar = editor.toolbarElements.preview;
		var toolbar_div = wrapper.previousSibling;
		toolbar.className = toolbar.className.replace(/\s*active\s*/g, '');
		toolbar_div.className = toolbar_div.className.replace(/\s*disabled-for-preview*/g, '');
	}

	// Start preview with the current text
	preview.innerHTML = editor.options.previewRender(editor.value(), preview);

	// Updates preview
	cm.on('update', function() {
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
		preview = document.createElement('div');
		preview.className = 'editor-preview';
		wrapper.appendChild(preview);
	}
	if(/editor-preview-active/.test(preview.className)) {
		preview.className = preview.className.replace(
			/\s*editor-preview-active\s*/g, ''
		);
		toolbar.className = toolbar.className.replace(/\s*active\s*/g, '');
		toolbar_div.className = toolbar_div.className.replace(/\s*disabled-for-preview*/g, '');
	} else {
		/* When the preview button is clicked for the first time,
		 * give some time for the transition from editor.css to fire and the view to slide from right to left,
		 * instead of just appearing.
		 */
		setTimeout(function() {
			preview.className += ' editor-preview-active'
		}, 1);
		toolbar.className += ' active';
		toolbar_div.className += ' disabled-for-preview';
	}
	preview.innerHTML = editor.options.previewRender(editor.value(), preview);

	// Turn off side by side if needed
	var sidebyside = cm.getWrapperElement().nextSibling;
	if(/editor-preview-active-side/.test(sidebyside.className))
		toggleSideBySide(editor);
}

function _replaceSelection(cm, active, start, end) {
	if(/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
		return;

	var text;
	var startPoint = cm.getCursor('start');
	var endPoint = cm.getCursor('end');
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

	var startPoint = cm.getCursor('start');
	var endPoint = cm.getCursor('end');
	for(var i = startPoint.line; i <= endPoint.line; i++) {
		(function(i) {
			var text = cm.getLine(i);
			var currHeadingLevel = text.search(/[^#]/);

			if(direction !== undefined) {
				if(currHeadingLevel <= 0) {
					if(direction == 'bigger') {
						text = '###### ' + text;
					} else {
						text = '# ' + text;
					}
				} else if(currHeadingLevel == 6 && direction == 'smaller') {
					text = text.substr(7);
				} else if(currHeadingLevel == 1 && direction == 'bigger') {
					text = text.substr(2);
				} else {
					if(direction == 'bigger') {
						text = text.substr(1);
					} else {
						text = '#' + text;
					}
				}
			} else {
				if(size == 1) {
					if(currHeadingLevel <= 0) {
						text = '# ' + text;
					} else if(currHeadingLevel == size) {
						text = text.substr(currHeadingLevel + 1);
					} else {
						text = '# ' + text.substr(currHeadingLevel + 1);
					}
				} else if(size == 2) {
					if(currHeadingLevel <= 0) {
						text = '## ' + text;
					} else if(currHeadingLevel == size) {
						text = text.substr(currHeadingLevel + 1);
					} else {
						text = '## ' + text.substr(currHeadingLevel + 1);
					}
				} else {
					if(currHeadingLevel <= 0) {
						text = '### ' + text;
					} else if(currHeadingLevel == size) {
						text = text.substr(currHeadingLevel + 1);
					} else {
						text = '### ' + text.substr(currHeadingLevel + 1);
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
	var startPoint = cm.getCursor('start');
	var endPoint = cm.getCursor('end');
	var repl = {
		'quote': /^(\s*)\>\s+/,
		'unordered-list': /^(\s*)(\*|\-|\+)\s+/,
		'ordered-list': /^(\s*)\d+\.\s+/
	};
	var map = {
		'quote': '> ',
		'unordered-list': '* ',
		'ordered-list': '1. '
	};
	for(var i = startPoint.line; i <= endPoint.line; i++) {
		(function(i) {
			var text = cm.getLine(i);
			if(stat[name]) {
				text = text.replace(repl[name], '$1');
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

	end_chars = (typeof end_chars === 'undefined') ? start_chars : end_chars;
	var cm = editor.codemirror;
	var stat = getState(cm);

	var text;
	var start = start_chars;
	var end = end_chars;

	var startPoint = cm.getCursor('start');
	var endPoint = cm.getCursor('end');

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
	},
	"italic": {
		name: "italic",
		action: toggleItalic,
		className: "fa fa-italic",
		title: "Italic (Ctrl+I)",
	},
	"strikethrough": {
		name: "strikethrough",
		action: toggleStrikethrough,
		className: "fa fa-strikethrough",
		title: "Strikethrough",
	},
	"heading": {
		name: "heading",
		action: toggleHeadingSmaller,
		className: "fa fa-header",
		title: "Heading (Ctrl+H)",
	},
	"heading-smaller": {
		name: "heading-smaller",
		action: toggleHeadingSmaller,
		className: "fa fa-header fa-header-x fa-header-smaller",
		title: "Smaller Heading (Ctrl+H)",
	},
	"heading-bigger": {
		name: "heading-bigger",
		action: toggleHeadingBigger,
		className: "fa fa-header fa-header-x fa-header-bigger",
		title: "Bigger Heading (Shift+Ctrl+H)",
	},
	"heading-1": {
		name: "heading-1",
		action: toggleHeading1,
		className: "fa fa-header fa-header-x fa-header-1",
		title: "Big Heading",
	},
	"heading-2": {
		name: "heading-2",
		action: toggleHeading2,
		className: "fa fa-header fa-header-x fa-header-2",
		title: "Medium Heading",
	},
	"heading-3": {
		name: "heading-3",
		action: toggleHeading3,
		className: "fa fa-header fa-header-x fa-header-3",
		title: "Small Heading",
	},
	"code": {
		name: "code",
		action: toggleCodeBlock,
		className: "fa fa-code",
		title: "Code (Ctrl+Alt+C)",
	},
	"quote": {
		name: "quote",
		action: toggleBlockquote,
		className: "fa fa-quote-left",
		title: "Quote (Ctrl+')",
	},
	"unordered-list": {
		name: "unordered-list",
		action: toggleUnorderedList,
		className: "fa fa-list-ul",
		title: "Generic List (Ctrl+L)",
	},
	"ordered-list": {
		name: "ordered-list",
		action: toggleOrderedList,
		className: "fa fa-list-ol",
		title: "Numbered List (Ctrl+Alt+L)",
	},
	"link": {
		name: "link",
		action: drawLink,
		className: "fa fa-link",
		title: "Create Link (Ctrl+K)",
	},
	"image": {
		name: "image",
		action: drawImage,
		className: "fa fa-picture-o",
		title: "Insert Image (Ctrl+Alt+I)",
	},
	"horizontal-rule": {
		name: "horizontal-rule",
		action: drawHorizontalRule,
		className: "fa fa-minus",
		title: "Insert Horizontal Line",
	},
	"preview": {
		name: "preview",
		action: togglePreview,
		className: "fa fa-eye",
		title: "Toggle Preview (Ctrl+P)",
	},
	"side-by-side": {
		name: "side-by-side",
		action: toggleSideBySide,
		className: "fa fa-columns",
		title: "Toggle Side by Side (F9)",
	},
	"fullscreen": {
		name: "fullscreen",
		action: toggleFullScreen,
		className: "fa fa-arrows-alt",
		title: "Toggle Fullscreen (F11)",
	},
	"guide": {
		name: "guide",
		action: "http://nextstepwebs.github.io/simplemde-markdown-editor/markdown-guide",
		className: "fa fa-question-circle",
		title: "Markdown Guide",
	}
};

var toolbar = ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen", "guide"];

/**
 * Interface of SimpleMDE.
 */
function SimpleMDE(options) {
	options = options || {};

	// Used later to refer to it's parent
	options.parent = this;

	// Find the textarea to use
	if(options.element) {
		this.element = options.element;
	} else if(options.element === null) {
		// This means that the element option was specified, but no element was found
		console.log("SimpleMDE: Error. No element was found.");
		return;
	}

	// Handle toolbar and status bar
	if(options.toolbar !== false)
		options.toolbar = options.toolbar || SimpleMDE.toolbar;

	if(!options.hasOwnProperty('status')) {
		options.status = ['autosave', 'lines', 'words', 'cursor'];
	}

	// Add default preview rendering function
	if(!options.previewRender) {
		options.previewRender = function(plainText) {
			// Note: 'this' refers to the options object
			return this.parent.markdown(plainText);
		}
	}

	// Set default options for parsing config
	options.parsingConfig = options.parsingConfig || {};

	// Update this options
	this.options = options;

	// Auto render
	this.render();

	// The codemirror component is only available after rendering
	// so, the setter for the initialValue can only run after
	// the element has been rendered
	if(options.initialValue) {
		this.value(options.initialValue);
	}
}

/**
 * Default toolbar elements.
 */
SimpleMDE.toolbar = toolbar;

/**
 * Default markdown render.
 */
SimpleMDE.prototype.markdown = function(text) {
	if(window.marked) {
		// Update options
		if(this.options && this.options.singleLineBreaks !== false) {
			marked.setOptions({
				breaks: true
			});
		}

		return marked(text);
	}
};

/**
 * Render editor to the given element.
 */
SimpleMDE.prototype.render = function(el) {
	if(!el) {
		el = this.element || document.getElementsByTagName('textarea')[0];
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
			keyMaps[fixShortcut(key)] = function(cm) {
				shortcuts[key](self);
			};
		})(key);
	}

	keyMaps["Enter"] = "newlineAndIndentContinueMarkdownList";
	keyMaps["Tab"] = "tabAndIndentMarkdownList";
	keyMaps["Shift-Tab"] = "shiftTabAndUnindentMarkdownList";
	keyMaps["F11"] = function(cm) {
		toggleFullScreen(self);
	};
	keyMaps["F9"] = function(cm) {
		toggleSideBySide(self);
	};
	keyMaps["Esc"] = function(cm) {
		if(cm.getOption("fullScreen")) toggleFullScreen(self);
	};

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
		lineWrapping: (options.lineWrapping === false) ? false : true
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
	var content = this.value();
	var simplemde = this;

	if(this.options.autosave.unique_id == undefined || this.options.autosave.unique_id == "") {
		console.log("SimpleMDE: You must set a unique_id to use the autosave feature");
		return;
	}

	if(simplemde.element.form != null && simplemde.element.form != undefined) {
		simplemde.element.form.addEventListener("submit", function() {
			localStorage.setItem(simplemde.options.autosave.unique_id, "");
		});
	}

	if(this.options.autosave.loaded !== true) {
		if(typeof localStorage.getItem(this.options.autosave.unique_id) == "string" && localStorage.getItem(this.options.autosave.unique_id) != "")
			this.codemirror.setValue(localStorage.getItem(this.options.autosave.unique_id));

		this.options.autosave.loaded = true;
	}

	if(localStorage) {
		localStorage.setItem(this.options.autosave.unique_id, content);
	}

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
};

SimpleMDE.prototype.createSideBySide = function() {
	var cm = this.codemirror;
	var wrapper = cm.getWrapperElement();
	var preview = wrapper.nextSibling;

	if(!preview || !/editor-preview-side/.test(preview.className)) {
		preview = document.createElement('div');
		preview.className = 'editor-preview-side';
		wrapper.parentNode.insertBefore(preview, wrapper.nextSibling);
	}

	// Syncs scroll  editor -> preview
	var cScroll = false;
	var pScroll = false;
	cm.on('scroll', function(v) {
		if(cScroll) {
			cScroll = false;
			return;
		};
		pScroll = true;
		height = v.getScrollInfo().height - v.getScrollInfo().clientHeight;
		ratio = parseFloat(v.getScrollInfo().top) / height;
		move = (preview.scrollHeight - preview.clientHeight) * ratio;
		preview.scrollTop = move;
	});

	// Syncs scroll  preview -> editor
	preview.onscroll = function(v) {
		if(pScroll) {
			pScroll = false;
			return;
		};
		cScroll = true;
		height = preview.scrollHeight - preview.clientHeight;
		ratio = parseFloat(preview.scrollTop) / height;
		move = (cm.getScrollInfo().height - cm.getScrollInfo().clientHeight) * ratio;
		cm.scrollTo(0, move);
	};
	return true;
}

SimpleMDE.prototype.createToolbar = function(items) {
	items = items || this.options.toolbar;

	if(!items || items.length === 0) {
		return;
	}

	for(var i = 0; i < items.length; i++) {
		if(toolbarBuiltInButtons[items[i]] != undefined) {
			items[i] = toolbarBuiltInButtons[items[i]];
		}
	}

	var bar = document.createElement('div');
	bar.className = 'editor-toolbar';

	var self = this;

	var el;
	var toolbar_data = {};
	self.toolbar = items;

	for(var i = 0; i < items.length; i++) {
		if(items[i].name == "guide" && self.options.toolbarGuideIcon === false)
			continue;

		(function(item) {
			var el;
			if(item === '|') {
				el = createSep();
			} else {
				el = createIcon(item, self.options.toolbarTips);
			}

			// bind events, special for info
			if(item.action) {
				if(typeof item.action === 'function') {
					el.onclick = function(e) {
						item.action(self);
					};
				} else if(typeof item.action === 'string') {
					el.href = item.action;
					el.target = '_blank';
				}
			}
			toolbar_data[item.name || item] = el;
			bar.appendChild(el);
		})(items[i]);
	}

	self.toolbarElements = toolbar_data;

	var cm = this.codemirror;
	cm.on('cursorActivity', function() {
		var stat = getState(cm);

		for(var key in toolbar_data) {
			(function(key) {
				var el = toolbar_data[key];
				if(stat[key]) {
					el.className += ' active';
				} else if(key != "fullscreen" && key != "side-by-side") {
					el.className = el.className.replace(/\s*active\s*/g, '');
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
	options = this.options;

	if(!status || status.length === 0) return;

	var bar = document.createElement('div');
	bar.className = 'editor-statusbar';

	var pos, cm = this.codemirror;
	for(var i = 0; i < status.length; i++) {
		(function(name) {
			var el = document.createElement('span');
			el.className = name;
			if(name === 'words') {
				el.innerHTML = '0';
				cm.on('update', function() {
					el.innerHTML = wordCount(cm.getValue());
				});
			} else if(name === 'lines') {
				el.innerHTML = '0';
				cm.on('update', function() {
					el.innerHTML = cm.lineCount();
				});
			} else if(name === 'cursor') {
				el.innerHTML = '0:0';
				cm.on('cursorActivity', function() {
					pos = cm.getCursor();
					el.innerHTML = pos.line + ':' + pos.ch;
				});
			} else if(name === 'autosave') {
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
