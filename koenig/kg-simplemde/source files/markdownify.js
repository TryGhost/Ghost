var isMac = /Mac/.test(navigator.platform);

var shortcuts = {
	'Cmd-B': toggleBold,
	'Cmd-I': toggleItalic,
	'Cmd-K': drawLink,
	'Cmd-Alt-I': drawImage,
	"Cmd-'": toggleBlockquote,
	'Cmd-Alt-L': toggleOrderedList,
	'Cmd-L': toggleUnOrderedList
};


/**
 * Fix shortcut. Mac use Command, others use Ctrl.
 */
function fixShortcut(name) {
	if (isMac) {
		name = name.replace('Ctrl', 'Cmd');
	} else {
		name = name.replace('Cmd', 'Ctrl');
	}
	return name;
}


/**
 * Create icon element for toolbar.
 */
function createIcon(name, options) {
	options = options || {};
	var el = document.createElement('a');

	var shortcut = options.shortcut || shortcuts[name];
	if (shortcut) {
		shortcut = fixShortcut(shortcut);
		el.title = shortcut;
		el.title = el.title.replace('Cmd', '⌘');
		if (isMac) {
			el.title = el.title.replace('Alt', '⌥');
		}
	}

	el.className = options.className || 'icon-' + name;
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
	if (!stat.type) return {};

	var types = stat.type.split(' ');

	var ret = {},
		data, text;
	for (var i = 0; i < types.length; i++) {
		data = types[i];
		if (data === 'strong') {
			ret.bold = true;
		} else if (data === 'variable-2') {
			text = cm.getLine(pos.line);
			if (/^\s*\d+\.\s/.test(text)) {
				ret['ordered-list'] = true;
			} else {
				ret['unordered-list'] = true;
			}
		} else if (data === 'atom') {
			ret.quote = true;
		} else if (data === 'em') {
			ret.italic = true;
		} else if (data === 'quote') {
			ret.quote = true;
		}
	}
	return ret;
}


/**
 * Toggle full screen of the editor.
 */
function toggleFullScreen(editor) {
	var el = editor.codemirror.getWrapperElement();

	// https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
	var doc = document;
	var isFull = doc.fullScreen || doc.mozFullScreen || doc.webkitFullScreen;
	var request = function() {
		if (el.requestFullScreen) {
			el.requestFullScreen();
		} else if (el.mozRequestFullScreen) {
			el.mozRequestFullScreen();
		} else if (el.webkitRequestFullScreen) {
			el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	};
	var cancel = function() {
		if (doc.cancelFullScreen) {
			doc.cancelFullScreen();
		} else if (doc.mozCancelFullScreen) {
			doc.mozCancelFullScreen();
		} else if (doc.webkitCancelFullScreen) {
			doc.webkitCancelFullScreen();
		}
	};
	if (!isFull) {
		request();
	} else if (cancel) {
		cancel();
	}
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
 * Action for toggling ul.
 */
function toggleUnOrderedList(editor) {
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
 * Preview action.
 */
function togglePreview(editor) {
	var toolbar_div = document.getElementsByClassName('editor-toolbar')[0];
	var toolbar = editor.toolbar.preview;
	var parse = editor.constructor.markdown;
	var cm = editor.codemirror;
	var wrapper = cm.getWrapperElement();
	var preview = wrapper.lastChild;
	if (!/editor-preview/.test(preview.className)) {
		preview = document.createElement('div');
		preview.className = 'editor-preview';
		wrapper.appendChild(preview);
	}
	if (/editor-preview-active/.test(preview.className)) {
		preview.className = preview.className.replace(
			/\s*editor-preview-active\s*/g, ''
		);
		toolbar.className = toolbar.className.replace(/\s*active\s*/g, '');
		toolbar_div.className = toolbar_div.className.replace(/\s*disabled-for-preview\s*/g, '');
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
	var text = cm.getValue();
	preview.innerHTML = parse(text);
}

function _replaceSelection(cm, active, start, end) {
	if (/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
		return;
	
	var text;
	var startPoint = cm.getCursor('start');
	var endPoint = cm.getCursor('end');
	if (active) {
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
		endPoint.ch += start.length;
	}
	cm.setSelection(startPoint, endPoint);
	cm.focus();
}


function _toggleLine(cm, name) {
	if (/editor-preview-active/.test(cm.getWrapperElement().lastChild.className))
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
	for (var i = startPoint.line; i <= endPoint.line; i++) {
		(function(i) {
			var text = cm.getLine(i);
			if (stat[name]) {
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
	if (/editor-preview-active/.test(editor.codemirror.getWrapperElement().lastChild.className))
		return;
	
	end_chars = (typeof end_chars === 'undefined') ? start_chars : end_chars;
	var cm = editor.codemirror;
	var stat = getState(cm);

	var text;
	var start = start_chars;
	var end = end_chars;

	var startPoint = cm.getCursor('start');
	var endPoint = cm.getCursor('end');

	if (stat[type]) {
		text = cm.getLine(startPoint.line);
		start = text.slice(0, startPoint.ch);
		end = text.slice(startPoint.ch);
		if (type == "bold") {
			start = start.replace(/(\*\*|__)(?![\s\S]*(\*\*|__))/, "");
			end = end.replace(/(\*\*|__)/, "");
		} else if (type == "italic") {
			start = start.replace(/(\*|_)(?![\s\S]*(\*|_))/, "");
			end = end.replace(/(\*|_)/, "");
		}
		cm.replaceRange(start + end, {
			line: startPoint.line,
			ch: 0
		}, {
			line: startPoint.line,
			ch: 99999999999999
		});

		if (type == "bold") {
			startPoint.ch -= 2;
			endPoint.ch -= 2;
		} else if (type == "italic") {
			startPoint.ch -= 1;
			endPoint.ch -= 1;
		}
	} else {
		text = cm.getSelection();
		if (type == "bold") {
			text = text.split("**").join("");
			text = text.split("__").join("");
		} else if (type == "italic") {
			text = text.split("*").join("");
			text = text.split("_").join("");
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
	if (m === null) return count;
	for (var i = 0; i < m.length; i++) {
		if (m[i].charCodeAt(0) >= 0x4E00) {
			count += m[i].length;
		} else {
			count += 1;
		}
	}
	return count;
}


var toolbar = [{
		name: 'bold',
		action: toggleBold,
		className: "fa fa-bold"
	}, {
		name: 'italic',
		action: toggleItalic,
		className: "fa fa-italic"
	},
	'|',

	{
		name: 'quote',
		action: toggleBlockquote,
		className: "fa fa-quote-left"
	}, {
		name: 'unordered-list',
		action: toggleUnOrderedList,
		className: "fa fa-list-ul"
	}, {
		name: 'ordered-list',
		action: toggleOrderedList,
		className: "fa fa-list-ol"
	},
	'|',

	{
		name: 'link',
		action: drawLink,
		className: "fa fa-link"
	}, {
		name: 'image',
		action: drawImage,
		className: "fa fa-picture-o"
	},
	'|',

	{
		name: 'preview',
		action: togglePreview,
		className: "fa fa-eye"
	},
];

/**
 * Interface of SimpleMDE.
 */
function SimpleMDE(options) {
	options = options || {};

	if (options.element) {
		this.element = options.element;
	}
	
	if(options.toolbar === false)
		options.toolbar = [];
	else
		options.toolbar = options.toolbar || SimpleMDE.toolbar;
	// you can customize toolbar with object
	// [{name: 'bold', shortcut: 'Ctrl-B', className: 'icon-bold'}]

	if (!options.hasOwnProperty('status')) {
		options.status = ['lines', 'words', 'cursor'];
	}

	this.options = options;

	// If user has passed an element, it should auto rendered
	if (this.element) {
		this.render();
	}
}

/**
 * Default toolbar elements.
 */
SimpleMDE.toolbar = toolbar;

/**
 * Default markdown render.
 */
SimpleMDE.markdown = function(text) {
	if (window.marked) {
		// use marked as markdown parser
		return marked(text);
	}
};

/**
 * Render editor to the given element.
 */
SimpleMDE.prototype.render = function(el) {
	if (!el) {
		el = this.element || document.getElementsByTagName('textarea')[0];
	}

	if (this._rendered && this._rendered === el) {
		// Already rendered.
		return;
	}

	this.element = el;
	var options = this.options;

	var self = this;
	var keyMaps = {};

	for (var key in shortcuts) {
		(function(key) {
			keyMaps[fixShortcut(key)] = function(cm) {
				shortcuts[key](self);
			};
		})(key);
	}

	keyMaps["Enter"] = "newlineAndIndentContinueMarkdownList";
	keyMaps['Tab'] = 'tabAndIndentContinueMarkdownList';
	keyMaps['Shift-Tab'] = 'shiftTabAndIndentContinueMarkdownList';

	this.codemirror = CodeMirror.fromTextArea(el, {
		mode: 'markdown',
		theme: 'paper',
		tabSize: '2',
		indentWithTabs: true,
		lineNumbers: false,
		autofocus: false,
		extraKeys: keyMaps,
		lineWrapping: true
	});

	if (options.toolbar !== false) {
		this.createToolbar();
	}
	if (options.status !== false) {
		this.createStatusbar();
	}

	this._rendered = this.element;
};

SimpleMDE.prototype.createToolbar = function(items) {
	items = items || this.options.toolbar;

	if (!items || items.length === 0) {
		return;
	}

	var bar = document.createElement('div');
	bar.className = 'editor-toolbar';

	var self = this;

	var el;
	self.toolbar = {};

	for (var i = 0; i < items.length; i++) {
		(function(item) {
			var el;
			if (item.name) {
				el = createIcon(item.name, item);
			} else if (item === '|') {
				el = createSep();
			} else {
				el = createIcon(item);
			}

			// bind events, special for info
			if (item.action) {
				if (typeof item.action === 'function') {
					el.onclick = function(e) {
						item.action(self);
					};
				} else if (typeof item.action === 'string') {
					el.href = item.action;
					el.target = '_blank';
				}
			}
			self.toolbar[item.name || item] = el;
			bar.appendChild(el);
		})(items[i]);
	}

	var cm = this.codemirror;
	cm.on('cursorActivity', function() {
		var stat = getState(cm);

		for (var key in self.toolbar) {
			(function(key) {
				var el = self.toolbar[key];
				if (stat[key]) {
					el.className += ' active';
				} else {
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

	if (!status || status.length === 0) return;

	var bar = document.createElement('div');
	bar.className = 'editor-statusbar';

	var pos, cm = this.codemirror;
	for (var i = 0; i < status.length; i++) {
		(function(name) {
			var el = document.createElement('span');
			el.className = name;
			if (name === 'words') {
				el.innerHTML = '0';
				cm.on('update', function() {
					el.innerHTML = wordCount(cm.getValue());
				});
			} else if (name === 'lines') {
				el.innerHTML = '0';
				cm.on('update', function() {
					el.innerHTML = cm.lineCount();
				});
			} else if (name === 'cursor') {
				el.innerHTML = '0:0';
				cm.on('cursorActivity', function() {
					pos = cm.getCursor();
					el.innerHTML = pos.line + ':' + pos.ch;
				});
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
	if (val) {
		this.codemirror.getDoc().setValue(val);
		return this;
	} else {
		return this.codemirror.getValue();
	}
};


/**
 * Bind static methods for exports.
 */
SimpleMDE.toggleBold = toggleBold;
SimpleMDE.toggleItalic = toggleItalic;
SimpleMDE.toggleBlockquote = toggleBlockquote;
SimpleMDE.toggleUnOrderedList = toggleUnOrderedList;
SimpleMDE.toggleOrderedList = toggleOrderedList;
SimpleMDE.drawLink = drawLink;
SimpleMDE.drawImage = drawImage;
SimpleMDE.undo = undo;
SimpleMDE.redo = redo;
SimpleMDE.togglePreview = togglePreview;
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
SimpleMDE.prototype.toggleBlockquote = function() {
	toggleBlockquote(this);
};
SimpleMDE.prototype.toggleUnOrderedList = function() {
	toggleUnOrderedList(this);
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
SimpleMDE.prototype.undo = function() {
	undo(this);
};
SimpleMDE.prototype.redo = function() {
	redo(this);
};
SimpleMDE.prototype.togglePreview = function() {
	togglePreview(this);
};
SimpleMDE.prototype.toggleFullScreen = function() {
	toggleFullScreen(this);
};