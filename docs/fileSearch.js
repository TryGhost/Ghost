// # fileSearch.js
//
// Contains methods for performing a fuzzy string search on file names
// for easily jumping between files. The ranking algorithm is not based
// on anything in particular - it's just a hack project that works reasonably
// well. If anyone has any suggestions on how it can be improved, then
// let me know.


// Wrap everything inside a closure so we don't get any collisions in
// the global scope
(function(){

  /**
   * ## escapeRegex
   *
   * Escapes special characters in a string to use when creating a new RegExp
   *
   * @param {string} term String to escape
   * @return {string} Regex-compatible escaped string
   */
  function escapeRegex(term){
    return term.replace(/[\[\]\{\}\(\)\^\$\.\*\+\|]/g, function(a){
      return '\\' + a;
    });
  }

  // A few heper constants; they don't really do much, but they
  // indicate the corresponding rows and columns in the matrix below.
  var UPPER = 0, LOWER = 1, NUMBER = 2, COMMON_DELIMS = 3, OTHER = 4;

  // Amount by which one character stands out when compared
  // to another character. Row = character in question,
  // col = character to compare to. E.g. uppercase letter
  // stands out with a factor of 240 compared to lowercase letter.
  // These numbers are pretty much plucked out of thin air.
  var relevanceMatrix = [
    [  0,   240,   120,   240,   220],
    [ 20,     0,    20,   120,   120],
    [140,   140,     0,   140,   140],
    [120,   120,   120,     0,   120],
    [120,   120,   120,   160,     0]
  ];

  /**
   * ## charType
   *
   * Categorizes a character as either lowercase, uppercase,
   * digit, strong delimiter, or other.
   *
   * @param {string} c The character to check
   * @return {number} One of the constants defined above
   */
  function charType(c){
    if(/[a-z]/.test(c)) return LOWER;
    if(/[A-Z]/.test(c)) return UPPER;
    if(/[0-9]/.test(c)) return NUMBER;
    if(/[\/\-_\.]/.test(c)) return COMMON_DELIMS;
    return OTHER;
  }

  /**
   * ## compareCharacters
   *
   * Compares a character to the characters before and
   * after it to see how much it stands out. For example
   * The letter B would stand out strongly in aBc
   *
   * @param {string} theChar The character in question
   * @param {string} before The immediately preceding character
   * @param {string} after The immediately following character
   * @return {number} Score according to how much the character stands out
   */
  function compareCharacters(theChar, before, after){

    // Grab the character types of all three characters
    var theType = charType(theChar),
        beforeType = charType(before),
        afterType = charType(after);

    // **MAGIC NUMBER ALERT** 0.4 is a number that makes it work best in my tests
    return relevanceMatrix[theType][beforeType] +
     0.4 * relevanceMatrix[theType][afterType];
  }

  /**
   * ## stripAccents
   *
   * Replaces all accented characters in a string with their
   * unaccented equivalent.
   *
   * @param {string} str The input accented string
   * @return {string} String with accents removed
   */
  var stripAccents = (function(accented, unaccented){
    var matchRegex = new RegExp('[' + accented + ']', 'g'),
        translationTable = {}, i;
        lookup = function(chr){
          return translationTable[chr] || chr;
        };

    for(i = 0; i < accented.length; i += 1){
      translationTable[accented.charAt(i)] = unaccented.charAt(i);
    }

    return function(str){
      return str.replace(matchRegex, lookup);
    };
  })('àáâãäçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
     'aaaaaceeeeiiiinooooouuuuyyAAAAACEEEEIIIINOOOOOUUUUY');

  /**
   * ## bestRank
   *
   * The real meat of this searching algorithm. Provides a score for a
   * given string against a given search term.
   *
   * The `startingFrom` parameter is necessary (rather than just truncating
   * `item` so we can use the initial characters of `item` to provide better
   * context.
   *
   * @param {string} item The string to rank
   * @param {string} term The search term against which to rank it
   * @param {number} startingFrom Ignore the first _n_ characters
   * @return {object} Rank of `item` against `term` with highlights
   */
  function bestRank(item, term, startingFrom){

    // If we've reached the end of our search term, add some extra points for being short
    if(term.length === 0) return startingFrom * 100 / item.length;

    // If we've reached the end of the item but not the term, then fail.
    if(item.length === 0) return -1;

    // Quick sanity check to make sure the remaining item has all the characters we need in order
    if(!item.slice(startingFrom).match(
      new RegExp( ('^.*' + escapeRegex(term.split('').join('~~K~~')) + '.*$').split('~~K~~').join('.*'), 'i' )
    )){
      return -1;
    }

    // Grab the first character that we're going to look at
    var firstSearchChar = term.charAt(0);

    // These variables store our best guess so far, and the character
    // indices to which it applies
    var bestRankSoFar = -1;
    var highlights;

    // Now loop over the item, and test all instances of `firstSearchChar` (case-insensitive)
    for(var i = startingFrom; i < item.length; i += 1){
      if(item.charAt(i).toLowerCase() !== firstSearchChar.toLowerCase()) continue;

      // Find out what the rest of the string scores against the rest of the term
      var subsequentRank = bestRank(item.substr(i), term.slice(1), 1);
      if(subsequentRank == -1) continue;

      // Inverse linear score for the character. Earlier in string = much better
      var characterScore = 400 / Math.max(1, i);

      // If, starting at this character, we have the whole of the search term in order, that's really
      // good. And if the term is really long, make it cubically good (quadratic scores added up)
      if(item.substr(i).toLowerCase().indexOf(term.toLowerCase()) === 0) characterScore += 3 * term.length * term.length;

      // Add on score for how much this character stands out
      characterScore += compareCharacters(
        item.charAt(i),
        i === 0 ? '/' : item.charAt(i - 1),
        i === item.length - 1 ? '/' : item.charAt(i + 1)
      );

      // Add on score from the rest of the string
      characterScore += subsequentRank;

      // If we've managed to better what we have so far, store it away
      if(characterScore > bestRankSoFar){
        bestRankSoFar = characterScore;

        // Save highlighted characters as well
        highlights = [i];
        var subsequentHighlights = subsequentRank.highlights || [];
        for(var j = 0; j < subsequentHighlights.length; j += 1){
          highlights.push(subsequentHighlights[j] + i);
        }
      }
    }

    // Return an object with valueOf so it can be directly compared using < and >
    // but also stores the highlight indices
    return {
      __score: bestRankSoFar,
      valueOf: function(){ return this.__score; },
      highlights: highlights
    };
  }

  /**
   * ## fuzzyScoreStr
   *
   * Actual function to use when matching an item against a term
   * (bestRank should only be used internally)
   *
   * @param {string} item Item to search
   * @param {string} term Term against which to search
   * @return {object} Rank of `item` against `term` with highlights
   */
  function fuzzyScoreStr(item, term){
    return bestRank(stripAccents(item), stripAccents(term), 0);
  }

  /**
   * ## fuzzyScore
   *
   * Matches an object against a given term with particular weights being
   * applied to different properties. If the given item is instead a string,
   * just match it directly against the term.
   *
   * The `relevances` parameter should be an object containing properties
   * with the same names as those on `item` that should be counted. For
   * example, a value of `{ propA: 2, propB: 1 }` would count matches in
   * `propA` twice as highly as matches in `propB`.
   *
   * The returned `highlights` property contains arrays of character indices
   * to highlight in the term, indexed by the same property names
   *
   * @param {object} item Item containing multiple properties to search
   * @param {string} term Term against which to search
   * @param {object} relevances Object congaining key/val pairs as above
   * @return {object} Rank of `item` against `term` with highlights.
   */
  function fuzzyScore(item, term, relevances){

    // If we have a string, just match it directly
    if(typeof item == 'string') return fuzzyScoreStr(item, term);

    // Initialize the return object
    var result = {
      __score: 0,
      valueOf: function(){ return this.__score; },
      highlights: {}
    };

    // Loop through all the specified properties
    for(var i in relevances){
      if(!relevances.hasOwnProperty(i) || !item.hasOwnProperty(i)) continue;

      // Grab the score for that particular property
      var thatScore = fuzzyScoreStr(item[i], term);

      // Add the rank on to the return object
      result.__score += relevances[i] * thatScore;
      result.highlights[i] = thatScore > 0 ? thatScore.highlights : [];
    }

    return result;
  }

  // ## Right, that's the end of the ranking stuff
  // Now onwards to building it into our page!


  // Loop through the tree and parse it all into a big array
  var fileList = [];

  function addDirToList(dir, path){
    if(dir.dirs){
      for(var i in dir.dirs)
        if(dir.dirs.hasOwnProperty(i)) addDirToList(dir.dirs[i], path + i + '/');
    }
    if(dir.files){
      for(var i = 0; i < dir.files.length; i += 1) fileList.push(path + dir.files[i]);
    }
  }

  addDirToList(tree, '');

  // Some variables to store the state of the search box
  var searchBoxShown = false;
  var searchingTimeout, selectedSearchIndex, selectedItem;

  /**
   * ## doSearch
   *
   * Actually perform the file search
   */
  function doSearch(){

    // Grab the search term from the input
    var term = document.getElementById('searchbox').value;

    var items = [];

    // Loop through all the files and rank them all
    for(var i = 0; i < fileList.length; i += 1){
      var f = fileList[i];

      // Split up the file name so we can grab the base name
      var parts = f.split('/');

      // This is the object that'll get passed to fuzzyScore
      var file = {
        fullPath: f,
        fileName: parts[parts.length - 1]
      };

      // Rank the file, primarily against the full path,
      // but if the file base name also matches, give it a
      // boost. 0.6 is a number that produces nice results
      var rank = fuzzyScore(file, term, {
        fullPath: 1,
        fileName: 0.6
      });

      // If the file scores positively against the search, add it in
      if(rank > 0){
        file.highlight = rank.highlights;
        file.score = +rank;
        items.push(file);
      }
    }

    // Sort the items order of decreasing relevance
    items.sort(function(a, b){
      if(a.score > b.score) return -1;
      if(a.score < b.score) return 1;
      return 0;
    });

    // And render them all
    renderSearchResults(items);
  }

  /**
   * ## highlightString
   *
   * Highlights the characters at given indices in a string
   *
   * @param {string} str String to highlight
   * @param {array} indexes Array of indices to make bold
   * @return {string} HTML of string with given characters made bold
   */
  function highlightString(str, indexes){

    // If there's nothing to do, return immediately
    if(!indexes || !indexes.length) return str;

    var out = '';

    // Loop through string one character at a time, highlighting as necessary
    for(var i = 0; i < str.length; i += 1){
      out += indexes.indexOf(i) !== -1 ? str.charAt(i).bold() : str.charAt(i);
    }
    return out;
  }

  /**
   * ## renderSearchResults
   *
   * Renders the processed search items as HTML with highlighting
   * in the results list
   *
   * @param {array} items Search results to render
   */
  function renderSearchResults(items){
    var html = '';

    // Loop through items, building up an HTML string
    for(var i = 0; i < items.length; i += 1){
      var f = items[i];
      html += [
        '<a class="item" data-value="', f.fullPath, '.html">',
          '<span class="score">', ~~f.score, '</span>',
          '<span class="filename">', highlightString(f.fileName, f.highlight.fileName), '</span>',
          '<span class="fullpath">', highlightString(f.fullPath, f.highlight.fullPath), '</span>',
        '</a>'
      ].join('');
    }

    // Dump all the html into the results list
    document.getElementById('searchresults').innerHTML = html;

    // Select the first item
    selectIndex(0);
  }

  /**
   * ## selectIndex
   *
   * Selects the search result at the given index in the list,
   * and deselcts any currently-selected item
   *
   * @param {number} idx Index of the item to select
   */
  function selectIndex(idx){

    // If another item is currently selected, deselect it
    if(selectedItem) selectedItem.className = selectedItem.className.replace(/\s?selected/,'');

    // Grab the search results straight from the DOM
    var r = document.getElementById('searchresults');
    var items = r.childNodes;

    // If we actually have no items, there's not much we can do
    if(items.length === 0){
      selectedSearchIndex = -1;
      selectedItem = false;
      return;
    }

    // Store the item and its index in helper variables
    selectedSearchIndex = idx;
    var s = selectedItem = items[idx];

    // Select the item
    s.className += ' selected';

    // Figure out whether or not the item is fully visible inside
    // the scrollable view, and if not, then scroll appropriately
    var o = s.offsetTop - r.offsetTop - r.scrollTop;
    if(o < 0){
      r.scrollTop = s.offsetTop - r.offsetTop;
    }else if(o > r.offsetHeight - s.offsetHeight){
      r.scrollTop = o + r.scrollTop - r.offsetHeight + s.offsetHeight;
    }
  }

  /**
   * ## selectNextItem
   *
   * Selects the result immediately after the currently selected item,
   * or the first item if the currently selected one is last in the list
   */
  function selectNextItem(){
    var items = document.getElementById('searchresults').childNodes;
    selectIndex((selectedSearchIndex + 1) % items.length);
  }

  /**
   * ## selectPreviouis
   *
   * Selects the result immediately preceding the currently selected item,
   * or the last item if the currently selected one is first in the list
   */
  function selectPreviousItem(){
    var items = document.getElementById('searchresults').childNodes;
    var l = items.length;
    selectIndex((selectedSearchIndex + l - 1) % l);
  }

  /**
   * ## searchFormKeyDown
   *
   * Fired whenever a key is pressed on the search form and triggers
   * the necessary events
   *
   * @param {KeyDownEvent} e The event object
   */
  function searchFormKeyDown(e){
    e = e || window.event;

    // 27 = escape, so hide the form
    if(e.keyCode == 27){
      document.body.removeChild(document.getElementById('search'));
      searchBoxShown = false;

    // 40 = down arrow, select the next item
    }else if(e.keyCode == 40){
      selectNextItem();
      e.preventDefault();
      e.stopPropagation();
      return false;

    // 38 = up arrow, select the previous item
    }else if(e.keyCode == 38){
      selectPreviousItem();
      e.preventDefault();
      e.stopPropagation();
      return false;

    // Most likely a letter typed or deleted in the search box.
    // So queue another search
    }else{
      clearTimeout(searchingTimeout);
      searchingTimeout = setTimeout(doSearch, 150);
    }
  }

  /**
   * ## addEvent
   *
   * Helper function for binding DOM events
   *
   * @param {Element} obj The DOM element to bind to
   * @param {string} evt The name of the event to bind to
   * @param {function} func Listener to attach to the event
   */
  function addEvent(obj, evt, func){
    var a;

    // Sensible browsers use `addEventListener`
    if((a = obj.addEventListener)){
      a.call(obj, evt, func, false);

    // IE uses `attachEvent`
    }else{
      obj.attachEvent('on' + evt, func);
    }
  }

  /**
   * ## searchFormSubmitted
   *
   * Called when the user hits enter on the search form
   * so find the selected item and jump to that page
   *
   * @param {FormSubmitEvent} e The submit event
   */
  function searchFormSubmitted(e){
    e = e || window.event;
    e.preventDefault();

    // If there's no selected item, do nothing
    if(!selectedItem) return false;

    // Otherwise, jump to the page
    window.location.href = relativeDir + selectedItem.getAttribute('data-value');

    return false;
  }

  /**
   * ## itemClicked
   *
   * Called when a search result item is clicked. So jump
   * to the relecant page using [searchFormSubmitted](#searchformsubmitted)
   *
   * @param {MouseClickEvent} e The mouse event
   */
  function itemClicked(e){

    // Maximum number of levels to jump up the DOM tree
    var levels = 5;
    var target = (e || window.event).target;

    // The click event may have propagated from a child node,
    // so loop upwards until we actually find the result item
    while(levels-- && target.tagName !== 'A') target = target.parentNode;

    // Set the selected item, then fire off the submit event on the form
    selectedItem = target;
    searchFormSubmitted(e);
  }

  /**
   * ## showSearchBox
   *
   * Constructs and shows the search box, optionally pre-populated
   * with a value for the search field
   *
   * @param {string,optional} val Pre-populated value for the search field
   */
  function showSearchBox(val){

    // If the box is already visible, do nothing
    if(searchBoxShown) return;
    searchBoxShown = true;

    // Create the containing element
    var f = document.createElement('div');
    f.id = "search";

    // Construct some basic HTML
    f.innerHTML = [
      '<div class="overlay"></div>',
      '<div class="box">',
        '<form id="searchform">',
          '<input id="searchbox" type="text" name="file" placeholder="Go to file..." autocomplete="off" value="', val, '"/>',
        '</form>',
        '<div id="searchresults"></div>',
      '</div>'
    ].join('');

    // Add the keydown event
    addEvent(f, 'keydown', searchFormKeyDown);

    // Add the container straight onto the body
    document.body.appendChild(f);

    // Focus the search field, and bind the necessary events
    document.getElementById('searchbox').focus();
    addEvent(document.getElementById('searchform'), 'submit', searchFormSubmitted);
    addEvent(document.getElementById('searchresults'), 'click', itemClicked);

    // If we have a pre-populated value, also fire off a search immediately
    if(val) doSearch();
  }

  /**
   * ## fileSearch_kd
   *
   * Fired as a global keyDown event on the document. Checks
   * if ctrl/cmd+P has been pressed and shows the search form
   *
   * @param {KeyDownEvent} e The key event
   */
  function fileSearch_kd(e){
    e = e || window.event;

    // 80 = p, so listen for ctrl/cmd+P
    if(e.keyCode === 80 && (e.ctrlKey || e.metaKey)){
      showSearchBox();
      e.preventDefault();
      return false;
    }
  }

  /**
   * ## fileSearch_kp
   *
   * Fired as a global keyPress event. Checks to see if the key pressed
   * was a sensible character, and if so then shows the search box and
   * fires off the first search
   */
  function fileSearch_kp(e){
    e = e || window.event;

    // If there are any modifiers or if we're already entering text into
    // another input field elsewhere, then do nothing
    if(e.ctrlKey || e.altKey || e.metaKey || e.target.tagName === 'INPUT') return true;

    // Grab the typed character, test it, and show the box if appropriate
    var theChar = String.fromCharCode(e.which);
    if(/[a-zA-Z0-9\.\/\_\-]/.test(theChar)) showSearchBox(theChar);
  }

  // Attach the global events to the document
  addEvent(document, 'keydown', fileSearch_kd);
  addEvent(document, 'keypress', fileSearch_kp);

})();
