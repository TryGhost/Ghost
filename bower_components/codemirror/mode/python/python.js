(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";


CodeMirror.defineMode("python", function(conf, parserConf) {
    var ERRORCLASS = 'error';

    function wordRegexp(words) {
        return new RegExp("^((" + words.join(")|(") + "))\\b");
    }

    var singleOperators = parserConf.singleOperators || new RegExp("^[\\+\\-\\*/%&|\\^~<>!]");
    var singleDelimiters = parserConf.singleDelimiters || new RegExp('^[\\(\\)\\[\\]\\{\\}@,:`=;\\.]');
    var doubleOperators = parserConf.doubleOperators || new RegExp("^((==)|(!=)|(<=)|(>=)|(<>)|(<<)|(>>)|(//)|(\\*\\*))");
    var doubleDelimiters = parserConf.doubleDelimiters || new RegExp("^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))");
    var tripleDelimiters = parserConf.tripleDelimiters || new RegExp("^((//=)|(>>=)|(<<=)|(\\*\\*=))");
    var identifiers = parserConf.identifiers|| new RegExp("^[_A-Za-z][_A-Za-z0-9]*");
    var hangingIndent = parserConf.hangingIndent || parserConf.indentUnit;

    var wordOperators = wordRegexp(['and', 'or', 'not', 'is', 'in']);
    var commonkeywords = ['as', 'assert', 'break', 'class', 'continue',
                          'def', 'del', 'elif', 'else', 'except', 'finally',
                          'for', 'from', 'global', 'if', 'import',
                          'lambda', 'pass', 'raise', 'return',
                          'try', 'while', 'with', 'yield'];
    var commonBuiltins = ['abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'callable', 'chr',
                          'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
                          'enumerate', 'eval', 'filter', 'float', 'format', 'frozenset',
                          'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id',
                          'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
                          'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next',
                          'object', 'oct', 'open', 'ord', 'pow', 'property', 'range',
                          'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
                          'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple',
                          'type', 'vars', 'zip', '__import__', 'NotImplemented',
                          'Ellipsis', '__debug__'];
    var py2 = {'builtins': ['apply', 'basestring', 'buffer', 'cmp', 'coerce', 'execfile',
                            'file', 'intern', 'long', 'raw_input', 'reduce', 'reload',
                            'unichr', 'unicode', 'xrange', 'False', 'True', 'None'],
               'keywords': ['exec', 'print']};
    var py3 = {'builtins': ['ascii', 'bytes', 'exec', 'print'],
               'keywords': ['nonlocal', 'False', 'True', 'None']};

    if(parserConf.extra_keywords != undefined){
        commonkeywords = commonkeywords.concat(parserConf.extra_keywords);
    }
    if(parserConf.extra_builtins != undefined){
        commonBuiltins = commonBuiltins.concat(parserConf.extra_builtins);
    }
    if (!!parserConf.version && parseInt(parserConf.version, 10) === 3) {
        commonkeywords = commonkeywords.concat(py3.keywords);
        commonBuiltins = commonBuiltins.concat(py3.builtins);
        var stringPrefixes = new RegExp("^(([rb]|(br))?('{3}|\"{3}|['\"]))", "i");
    } else {
        commonkeywords = commonkeywords.concat(py2.keywords);
        commonBuiltins = commonBuiltins.concat(py2.builtins);
        var stringPrefixes = new RegExp("^(([rub]|(ur)|(br))?('{3}|\"{3}|['\"]))", "i");
    }
    var keywords = wordRegexp(commonkeywords);
    var builtins = wordRegexp(commonBuiltins);

    var indentInfo = null;

    // tokenizers
    function tokenBase(stream, state) {
        // Handle scope changes
        if (stream.sol()) {
            var scopeOffset = state.scopes[0].offset;
            if (stream.eatSpace()) {
                var lineOffset = stream.indentation();
                if (lineOffset > scopeOffset) {
                    indentInfo = 'indent';
                } else if (lineOffset < scopeOffset) {
                    indentInfo = 'dedent';
                }
                return null;
            } else {
                if (scopeOffset > 0) {
                    dedent(stream, state);
                }
            }
        }
        if (stream.eatSpace()) {
            return null;
        }

        var ch = stream.peek();

        // Handle Comments
        if (ch === '#') {
            stream.skipToEnd();
            return 'comment';
        }

        // Handle Number Literals
        if (stream.match(/^[0-9\.]/, false)) {
            var floatLiteral = false;
            // Floats
            if (stream.match(/^\d*\.\d+(e[\+\-]?\d+)?/i)) { floatLiteral = true; }
            if (stream.match(/^\d+\.\d*/)) { floatLiteral = true; }
            if (stream.match(/^\.\d+/)) { floatLiteral = true; }
            if (floatLiteral) {
                // Float literals may be "imaginary"
                stream.eat(/J/i);
                return 'number';
            }
            // Integers
            var intLiteral = false;
            // Hex
            if (stream.match(/^0x[0-9a-f]+/i)) { intLiteral = true; }
            // Binary
            if (stream.match(/^0b[01]+/i)) { intLiteral = true; }
            // Octal
            if (stream.match(/^0o[0-7]+/i)) { intLiteral = true; }
            // Decimal
            if (stream.match(/^[1-9]\d*(e[\+\-]?\d+)?/)) {
                // Decimal literals may be "imaginary"
                stream.eat(/J/i);
                // TODO - Can you have imaginary longs?
                intLiteral = true;
            }
            // Zero by itself with no other piece of number.
            if (stream.match(/^0(?![\dx])/i)) { intLiteral = true; }
            if (intLiteral) {
                // Integer literals may be "long"
                stream.eat(/L/i);
                return 'number';
            }
        }

        // Handle Strings
        if (stream.match(stringPrefixes)) {
            state.tokenize = tokenStringFactory(stream.current());
            return state.tokenize(stream, state);
        }

        // Handle operators and Delimiters
        if (stream.match(tripleDelimiters) || stream.match(doubleDelimiters)) {
            return null;
        }
        if (stream.match(doubleOperators)
            || stream.match(singleOperators)
            || stream.match(wordOperators)) {
            return 'operator';
        }
        if (stream.match(singleDelimiters)) {
            return null;
        }

        if (stream.match(keywords)) {
            return 'keyword';
        }

        if (stream.match(builtins)) {
            return 'builtin';
        }

        if (stream.match(/^(self|cls)\b/)) {
            return "variable-2";
        }

        if (stream.match(identifiers)) {
            if (state.lastToken == 'def' || state.lastToken == 'class') {
                return 'def';
            }
            return 'variable';
        }

        // Handle non-detected items
        stream.next();
        return ERRORCLASS;
    }

    function tokenStringFactory(delimiter) {
        while ('rub'.indexOf(delimiter.charAt(0).toLowerCase()) >= 0) {
            delimiter = delimiter.substr(1);
        }
        var singleline = delimiter.length == 1;
        var OUTCLASS = 'string';

        function tokenString(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"\\]/);
                if (stream.eat('\\')) {
                    stream.next();
                    if (singleline && stream.eol()) {
                        return OUTCLASS;
                    }
                } else if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors) {
                    return ERRORCLASS;
                } else {
                    state.tokenize = tokenBase;
                }
            }
            return OUTCLASS;
        }
        tokenString.isString = true;
        return tokenString;
    }

    function indent(stream, state, type) {
        type = type || 'py';
        var indentUnit = 0;
        if (type === 'py') {
            if (state.scopes[0].type !== 'py') {
                state.scopes[0].offset = stream.indentation();
                return;
            }
            for (var i = 0; i < state.scopes.length; ++i) {
                if (state.scopes[i].type === 'py') {
                    indentUnit = state.scopes[i].offset + conf.indentUnit;
                    break;
                }
            }
        } else if (stream.match(/\s*($|#)/, false)) {
            // An open paren/bracket/brace with only space or comments after it
            // on the line will indent the next line a fixed amount, to make it
            // easier to put arguments, list items, etc. on their own lines.
            indentUnit = stream.indentation() + hangingIndent;
        } else {
            indentUnit = stream.column() + stream.current().length;
        }
        state.scopes.unshift({
            offset: indentUnit,
            type: type
        });
    }

    function dedent(stream, state, type) {
        type = type || 'py';
        if (state.scopes.length == 1) return;
        if (state.scopes[0].type === 'py') {
            var _indent = stream.indentation();
            var _indent_index = -1;
            for (var i = 0; i < state.scopes.length; ++i) {
                if (_indent === state.scopes[i].offset) {
                    _indent_index = i;
                    break;
                }
            }
            if (_indent_index === -1) {
                return true;
            }
            while (state.scopes[0].offset !== _indent) {
                state.scopes.shift();
            }
            return false;
        } else {
            if (type === 'py') {
                state.scopes[0].offset = stream.indentation();
                return false;
            } else {
                if (state.scopes[0].type != type) {
                    return true;
                }
                state.scopes.shift();
                return false;
            }
        }
    }

    function tokenLexer(stream, state) {
        indentInfo = null;
        var style = state.tokenize(stream, state);
        var current = stream.current();

        // Handle '.' connected identifiers
        if (current === '.') {
            style = stream.match(identifiers, false) ? null : ERRORCLASS;
            if (style === null && state.lastStyle === 'meta') {
                // Apply 'meta' style to '.' connected identifiers when
                // appropriate.
                style = 'meta';
            }
            return style;
        }

        // Handle decorators
        if (current === '@') {
            return stream.match(identifiers, false) ? 'meta' : ERRORCLASS;
        }

        if ((style === 'variable' || style === 'builtin')
            && state.lastStyle === 'meta') {
            style = 'meta';
        }

        // Handle scope changes.
        if (current === 'pass' || current === 'return') {
            state.dedent += 1;
        }
        if (current === 'lambda') state.lambda = true;
        if ((current === ':' && !state.lambda && state.scopes[0].type == 'py')
            || indentInfo === 'indent') {
            indent(stream, state);
        }
        var delimiter_index = '[({'.indexOf(current);
        if (delimiter_index !== -1) {
            indent(stream, state, '])}'.slice(delimiter_index, delimiter_index+1));
        }
        if (indentInfo === 'dedent') {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }
        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index !== -1) {
            if (dedent(stream, state, current)) {
                return ERRORCLASS;
            }
        }
        if (state.dedent > 0 && stream.eol() && state.scopes[0].type == 'py') {
            if (state.scopes.length > 1) state.scopes.shift();
            state.dedent -= 1;
        }

        return style;
    }

    var external = {
        startState: function(basecolumn) {
            return {
              tokenize: tokenBase,
              scopes: [{offset:basecolumn || 0, type:'py'}],
              lastStyle: null,
              lastToken: null,
              lambda: false,
              dedent: 0
          };
        },

        token: function(stream, state) {
            var style = tokenLexer(stream, state);

            state.lastStyle = style;

            var current = stream.current();
            if (current && style) {
                state.lastToken = current;
            }

            if (stream.eol() && state.lambda) {
                state.lambda = false;
            }
            return style;
        },

        indent: function(state) {
            if (state.tokenize != tokenBase) {
                return state.tokenize.isString ? CodeMirror.Pass : 0;
            }

            return state.scopes[0].offset;
        },

        lineComment: "#",
        fold: "indent"
    };
    return external;
});

CodeMirror.defineMIME("text/x-python", "python");

var words = function(str){return str.split(' ');};

CodeMirror.defineMIME("text/x-cython", {
  name: "python",
  extra_keywords: words("by cdef cimport cpdef ctypedef enum except"+
                        "extern gil include nogil property public"+
                        "readonly struct union DEF IF ELIF ELSE")
});

});
