(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("../../mode/sql/sql"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "../../mode/sql/sql"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var tables;
  var keywords;
  var CONS = {
    QUERY_DIV: ";",
    ALIAS_KEYWORD: "AS"
  };
  var Pos = CodeMirror.Pos;

  function getKeywords(editor) {
    var mode = editor.doc.modeOption;
    if(mode === "sql") mode = "text/x-sql";
    return CodeMirror.resolveMode(mode).keywords;
  }

  function match(string, word) {
    var len = string.length;
    var sub = word.substr(0, len);
    return string.toUpperCase() === sub.toUpperCase();
  }

  function addMatches(result, search, wordlist, formatter) {
    for(var word in wordlist) {
      if(!wordlist.hasOwnProperty(word)) continue;
      if(Array.isArray(wordlist)) {
        word = wordlist[word];
      }
      if(match(search, word)) {
        result.push(formatter(word));
      }
    }
  }

  function columnCompletion(result, editor) {
    var cur = editor.getCursor();
    var token = editor.getTokenAt(cur);
    var string = token.string.substr(1);
    var prevCur = Pos(cur.line, token.start);
    var table = editor.getTokenAt(prevCur).string;
    if( !tables.hasOwnProperty( table ) ){
      table = findTableByAlias(table, editor);
    }
    var columns = tables[table];
    if(!columns) {
      return;
    }
    addMatches(result, string, columns,
        function(w) {return "." + w;});
  }

  function eachWord(lineText, f) {
    if( !lineText ){return;}
    var excepted = /[,;]/g;
    var words = lineText.split( " " );
    for( var i = 0; i < words.length; i++ ){
      f( words[i]?words[i].replace( excepted, '' ) : '' );
    }
  }

  function convertCurToNumber( cur ){
    // max characters of a line is 999,999.
    return cur.line + cur.ch / Math.pow( 10, 6 );
  }

  function convertNumberToCur( num ){
    return Pos(Math.floor( num ), +num.toString().split( '.' ).pop());
  }

  function findTableByAlias(alias, editor) {
    var doc = editor.doc;
    var fullQuery = doc.getValue();
    var aliasUpperCase = alias.toUpperCase();
    var previousWord = "";
    var table = "";
    var separator = [];
    var validRange = {
      start: Pos( 0, 0 ),
      end: Pos( editor.lastLine(), editor.getLineHandle( editor.lastLine() ).length )
    };

    //add separator
    var indexOfSeparator = fullQuery.indexOf( CONS.QUERY_DIV );
    while( indexOfSeparator != -1 ){
      separator.push( doc.posFromIndex(indexOfSeparator));
      indexOfSeparator = fullQuery.indexOf( CONS.QUERY_DIV, indexOfSeparator+1);
    }
    separator.unshift( Pos( 0, 0 ) );
    separator.push( Pos( editor.lastLine(), editor.getLineHandle( editor.lastLine() ).text.length ) );

    //find valieRange
    var prevItem = 0;
    var current = convertCurToNumber( editor.getCursor() );
    for( var i=0; i< separator.length; i++){
      var _v = convertCurToNumber( separator[i] );
      if( current > prevItem && current <= _v ){
        validRange = { start: convertNumberToCur( prevItem ), end: convertNumberToCur( _v ) };
        break;
      }
      prevItem = _v;
    }

    var query = doc.getRange(validRange.start, validRange.end, false);

    for(var i=0; i < query.length; i++){
      var lineText = query[i];
      eachWord( lineText, function( word ){
        var wordUpperCase = word.toUpperCase();
        if( wordUpperCase === aliasUpperCase && tables.hasOwnProperty( previousWord ) ){
            table = previousWord;
        }
        if( wordUpperCase !== CONS.ALIAS_KEYWORD ){
          previousWord = word;
        }
      });
      if( table ){ break; }
    }
    return table;
  }

  function sqlHint(editor, options) {
    tables = (options && options.tables) || {};
    keywords = keywords || getKeywords(editor);
    var cur = editor.getCursor();
    var token = editor.getTokenAt(cur), end = token.end;
    var result = [];
    var search = token.string.trim();

    if (search.charAt(0) == ".") {
      columnCompletion(result, editor);
      if (!result.length) {
        while (token.start && search.charAt(0) == ".") {
          token = editor.getTokenAt(Pos(cur.line, token.start - 1));
          search = token.string + search;
        }
        addMatches(result, search, tables,
                   function(w) {return w;});
      }
    } else {
      addMatches(result, search, keywords,
                 function(w) {return w.toUpperCase();});
      addMatches(result, search, tables,
                 function(w) {return w;});
    }

    return {
      list: result,
        from: Pos(cur.line, token.start),
        to: Pos(cur.line, end)
    };
  }
  CodeMirror.registerHelper("hint", "sql", sqlHint);
});
