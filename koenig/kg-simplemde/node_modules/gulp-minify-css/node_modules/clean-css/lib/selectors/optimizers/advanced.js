var optimizeProperties = require('../../properties/optimizer');
var CleanUp = require('./clean-up');

var extractProperties = require('../extractor');
var canReorder = require('../reorderable').canReorder;
var canReorderSingle = require('../reorderable').canReorderSingle;
var stringifyAll = require('../../stringifier/one-time').all;
var stringifyBody = require('../../stringifier/one-time').body;
var stringifySelectors = require('../../stringifier/one-time').selectors;

function AdvancedOptimizer(options, context) {
  this.options = options;
  this.validator = context.validator;
}

function unsafeSelector(value) {
  return /\.|\*| :/.test(value);
}

function naturalSorter(a, b) {
  return a > b;
}

AdvancedOptimizer.prototype.isSpecial = function (selector) {
  return this.options.compatibility.selectors.special.test(selector);
};

AdvancedOptimizer.prototype.removeDuplicates = function (tokens) {
  var matched = {};
  var moreThanOnce = [];
  var id, token;
  var body, bodies;

  for (var i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];
    if (token[0] != 'selector')
      continue;

    id = stringifySelectors(token[1]);

    if (matched[id] && matched[id].length == 1)
      moreThanOnce.push(id);
    else
      matched[id] = matched[id] || [];

    matched[id].push(i);
  }

  for (i = 0, l = moreThanOnce.length; i < l; i++) {
    id = moreThanOnce[i];
    bodies = [];

    for (var j = matched[id].length - 1; j >= 0; j--) {
      token = tokens[matched[id][j]];
      body = stringifyBody(token[2]);

      if (bodies.indexOf(body) > -1)
        token[2] = [];
      else
        bodies.push(body);
    }
  }
};

AdvancedOptimizer.prototype.mergeAdjacent = function (tokens) {
  var lastToken = [null, [], []];
  var adjacentSpace = this.options.compatibility.selectors.adjacentSpace;

  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];

    if (token[0] != 'selector') {
      lastToken = [null, [], []];
      continue;
    }

    if (lastToken[0] == 'selector' && stringifySelectors(token[1]) == stringifySelectors(lastToken[1])) {
      var joinAt = [lastToken[2].length];
      Array.prototype.push.apply(lastToken[2], token[2]);
      optimizeProperties(token[1], lastToken[2], joinAt, true, this.options, this.validator);
      token[2] = [];
    } else if (lastToken[0] == 'selector' && stringifyBody(token[2]) == stringifyBody(lastToken[2]) &&
        !this.isSpecial(stringifySelectors(token[1])) && !this.isSpecial(stringifySelectors(lastToken[1]))) {
      lastToken[1] = CleanUp.selectors(lastToken[1].concat(token[1]), false, adjacentSpace);
      token[2] = [];
    } else {
      lastToken = token;
    }
  }
};

AdvancedOptimizer.prototype.reduceNonAdjacent = function (tokens) {
  var candidates = {};
  var repeated = [];

  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];

    if (token[0] != 'selector')
      continue;
    if (token[2].length === 0)
      continue;

    var selectorAsString = stringifySelectors(token[1]);
    var isComplexAndNotSpecial = token[1].length > 1 && !this.isSpecial(selectorAsString);
    var selectors = isComplexAndNotSpecial ?
      [selectorAsString].concat(token[1]) :
      [selectorAsString];

    for (var j = 0, m = selectors.length; j < m; j++) {
      var selector = selectors[j];

      if (!candidates[selector])
        candidates[selector] = [];
      else
        repeated.push(selector);

      candidates[selector].push({
        where: i,
        list: token[1],
        isPartial: isComplexAndNotSpecial && j > 0,
        isComplex: isComplexAndNotSpecial && j === 0
      });
    }
  }

  this.reduceSimpleNonAdjacentCases(tokens, repeated, candidates);
  this.reduceComplexNonAdjacentCases(tokens, candidates);
};

AdvancedOptimizer.prototype.reduceSimpleNonAdjacentCases = function (tokens, repeated, candidates) {
  function filterOut(idx, bodies) {
    return data[idx].isPartial && bodies.length === 0;
  }

  function reduceBody(token, newBody, processedCount, tokenIdx) {
    if (!data[processedCount - tokenIdx - 1].isPartial)
      token[2] = newBody;
  }

  for (var i = 0, l = repeated.length; i < l; i++) {
    var selector = repeated[i];
    var data = candidates[selector];

    this.reduceSelector(tokens, selector, data, {
      filterOut: filterOut,
      callback: reduceBody
    });
  }
};

AdvancedOptimizer.prototype.reduceComplexNonAdjacentCases = function (tokens, candidates) {
  var localContext = {};

  function filterOut(idx) {
    return localContext.data[idx].where < localContext.intoPosition;
  }

  function collectReducedBodies(token, newBody, processedCount, tokenIdx) {
    if (tokenIdx === 0)
      localContext.reducedBodies.push(newBody);
  }

  allSelectors:
  for (var complexSelector in candidates) {
    var into = candidates[complexSelector];
    if (!into[0].isComplex)
      continue;

    var intoPosition = into[into.length - 1].where;
    var intoToken = tokens[intoPosition];
    var reducedBodies = [];

    var selectors = this.isSpecial(complexSelector) ?
      [complexSelector] :
      into[0].list;

    localContext.intoPosition = intoPosition;
    localContext.reducedBodies = reducedBodies;

    for (var j = 0, m = selectors.length; j < m; j++) {
      var selector = selectors[j];
      var data = candidates[selector];

      if (data.length < 2)
        continue allSelectors;

      localContext.data = data;

      this.reduceSelector(tokens, selector, data, {
        filterOut: filterOut,
        callback: collectReducedBodies
      });

      if (stringifyBody(reducedBodies[reducedBodies.length - 1]) != stringifyBody(reducedBodies[0]))
        continue allSelectors;
    }

    intoToken[2] = reducedBodies[0];
  }
};

AdvancedOptimizer.prototype.reduceSelector = function (tokens, selector, data, options) {
  var bodies = [];
  var bodiesAsList = [];
  var joinsAt = [];
  var processedTokens = [];

  for (var j = data.length - 1, m = 0; j >= 0; j--) {
    if (options.filterOut(j, bodies))
      continue;

    var where = data[j].where;
    var token = tokens[where];

    bodies = bodies.concat(token[2]);
    bodiesAsList.push(token[2]);
    processedTokens.push(where);
  }

  for (j = 0, m = bodiesAsList.length; j < m; j++) {
    if (bodiesAsList[j].length > 0)
      joinsAt.push((joinsAt[j - 1] || 0) + bodiesAsList[j].length);
  }

  optimizeProperties(selector, bodies, joinsAt, false, this.options, this.validator);

  var processedCount = processedTokens.length;
  var propertyIdx = bodies.length - 1;
  var tokenIdx = processedCount - 1;

  while (tokenIdx >= 0) {
     if ((tokenIdx === 0 || (bodies[propertyIdx] && bodiesAsList[tokenIdx].indexOf(bodies[propertyIdx]) > -1)) && propertyIdx > -1) {
      propertyIdx--;
      continue;
    }

    var newBody = bodies.splice(propertyIdx + 1);
    options.callback(tokens[processedTokens[tokenIdx]], newBody, processedCount, tokenIdx);

    tokenIdx--;
  }
};

AdvancedOptimizer.prototype.mergeNonAdjacentBySelector = function (tokens) {
  var allSelectors = {};
  var repeatedSelectors = [];
  var i;

  for (i = tokens.length - 1; i >= 0; i--) {
    if (tokens[i][0] != 'selector')
      continue;
    if (tokens[i][2].length === 0)
      continue;

    var selector = stringifySelectors(tokens[i][1]);
    allSelectors[selector] = [i].concat(allSelectors[selector] || []);

    if (allSelectors[selector].length == 2)
      repeatedSelectors.push(selector);
  }

  for (i = repeatedSelectors.length - 1; i >= 0; i--) {
    var positions = allSelectors[repeatedSelectors[i]];

    selectorIterator:
    for (var j = positions.length - 1; j > 0; j--) {
      var positionOne = positions[j - 1];
      var tokenOne = tokens[positionOne];
      var positionTwo = positions[j];
      var tokenTwo = tokens[positionTwo];

      directionIterator:
      for (var direction = 1; direction >= -1; direction -= 2) {
        var topToBottom = direction == 1;
        var from = topToBottom ? positionOne + 1 : positionTwo - 1;
        var to = topToBottom ? positionTwo : positionOne;
        var delta = topToBottom ? 1 : -1;
        var moved = topToBottom ? tokenOne : tokenTwo;
        var target = topToBottom ? tokenTwo : tokenOne;
        var movedProperties = extractProperties(moved);
        var joinAt;

        while (from != to) {
          var traversedProperties = extractProperties(tokens[from]);
          from += delta;

          // traversed then moved as we move selectors towards the start
          var reorderable = topToBottom ?
            canReorder(movedProperties, traversedProperties) :
            canReorder(traversedProperties, movedProperties);

          if (!reorderable && !topToBottom)
            continue selectorIterator;
          if (!reorderable && topToBottom)
            continue directionIterator;
        }

        if (topToBottom) {
          joinAt = [moved[2].length];
          Array.prototype.push.apply(moved[2], target[2]);
          target[2] = moved[2];
        } else {
          joinAt = [target[2].length];
          Array.prototype.push.apply(target[2], moved[2]);
        }

        optimizeProperties(target[1], target[2], joinAt, true, this.options, this.validator);
        moved[2] = [];
      }
    }
  }
};

function isBemElement(token) {
  var asString = stringifySelectors(token[1]);
  return asString.indexOf('__') > -1 || asString.indexOf('--') > -1;
}

function withoutModifier(selector) {
  return selector.replace(/--[^ ,>\+~:]+/g, '');
}

function removeAnyUnsafeElements(left, candidates) {
  var leftSelector = withoutModifier(stringifySelectors(left[1]));

  for (var body in candidates) {
    var right = candidates[body];
    var rightSelector = withoutModifier(stringifySelectors(right[1]));

    if (rightSelector.indexOf(leftSelector) > -1 || leftSelector.indexOf(rightSelector) > -1)
      delete candidates[body];
  }
}

AdvancedOptimizer.prototype.mergeNonAdjacentByBody = function (tokens) {
  var candidates = {};
  var adjacentSpace = this.options.compatibility.selectors.adjacentSpace;

  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];
    if (token[0] != 'selector')
      continue;

    if (token[2].length > 0 && (!this.options.semanticMerging && unsafeSelector(stringifySelectors(token[1]))))
      candidates = {};

    if (token[2].length > 0 && this.options.semanticMerging && isBemElement(token))
      removeAnyUnsafeElements(token, candidates);

    var oldToken = candidates[stringifyBody(token[2])];
    if (oldToken && !this.isSpecial(stringifySelectors(token[1])) && !this.isSpecial(stringifySelectors(oldToken[1]))) {
      token[1] = CleanUp.selectors(oldToken[1].concat(token[1]), false, adjacentSpace);

      oldToken[2] = [];
      candidates[stringifyBody(token[2])] = null;
    }

    candidates[stringifyBody(token[2])] = token;
  }
};

AdvancedOptimizer.prototype.restructure = function (tokens) {
  var movableTokens = {};
  var movedProperties = [];
  var multiPropertyMoveCache = {};
  var movedToBeDropped = [];
  var self = this;
  var maxCombinationsLevel = 2;
  var ID_JOIN_CHARACTER = '%';

  function sendToMultiPropertyMoveCache(position, movedProperty, allFits) {
    for (var i = allFits.length - 1; i >= 0; i--) {
      var fit = allFits[i][0];
      var id = addToCache(movedProperty, fit);

      if (multiPropertyMoveCache[id].length > 1 && processMultiPropertyMove(position, multiPropertyMoveCache[id])) {
        removeAllMatchingFromCache(id);
        break;
      }
    }
  }

  function addToCache(movedProperty, fit) {
    var id = cacheId(fit);
    multiPropertyMoveCache[id] = multiPropertyMoveCache[id] || [];
    multiPropertyMoveCache[id].push([movedProperty, fit]);
    return id;
  }

  function removeAllMatchingFromCache(matchId) {
    var matchSelectors = matchId.split(ID_JOIN_CHARACTER);
    var forRemoval = [];
    var i;

    for (var id in multiPropertyMoveCache) {
      var selectors = id.split(ID_JOIN_CHARACTER);
      for (i = selectors.length - 1; i >= 0; i--) {
        if (matchSelectors.indexOf(selectors[i]) > -1) {
          forRemoval.push(id);
          break;
        }
      }
    }

    for (i = forRemoval.length - 1; i >= 0; i--) {
      delete multiPropertyMoveCache[forRemoval[i]];
    }
  }

  function cacheId(cachedTokens) {
    var id = [];
    for (var i = 0, l = cachedTokens.length; i < l; i++) {
      id.push(stringifySelectors(cachedTokens[i][1]));
    }
    return id.join(ID_JOIN_CHARACTER);
  }

  function tokensToMerge(sourceTokens) {
    var uniqueTokensWithBody = [];
    var mergeableTokens = [];

    for (var i = sourceTokens.length - 1; i >= 0; i--) {
      if (self.isSpecial(stringifySelectors(sourceTokens[i][1])))
        continue;

      mergeableTokens.unshift(sourceTokens[i]);
      if (sourceTokens[i][2].length > 0 && uniqueTokensWithBody.indexOf(sourceTokens[i]) == -1)
        uniqueTokensWithBody.push(sourceTokens[i]);
    }

    return uniqueTokensWithBody.length > 1 ?
      mergeableTokens :
      [];
  }

  function shortenIfPossible(position, movedProperty) {
    var name = movedProperty[0];
    var value = movedProperty[1];
    var key = movedProperty[4];
    var valueSize = name.length + value.length + 1;
    var allSelectors = [];
    var qualifiedTokens = [];

    var mergeableTokens = tokensToMerge(movableTokens[key]);
    if (mergeableTokens.length < 2)
      return;

    var allFits = findAllFits(mergeableTokens, valueSize, 1);
    var bestFit = allFits[0];
    if (bestFit[1] > 0)
      return sendToMultiPropertyMoveCache(position, movedProperty, allFits);

    for (var i = bestFit[0].length - 1; i >=0; i--) {
      allSelectors = bestFit[0][i][1].concat(allSelectors);
      qualifiedTokens.unshift(bestFit[0][i]);
    }

    allSelectors = CleanUp.selectorDuplicates(allSelectors);
    dropAsNewTokenAt(position, [movedProperty], allSelectors, qualifiedTokens);
  }

  function fitSorter(fit1, fit2) {
    return fit1[1] > fit2[1];
  }

  function findAllFits(mergeableTokens, propertySize, propertiesCount) {
    var combinations = allCombinations(mergeableTokens, propertySize, propertiesCount, maxCombinationsLevel - 1);
    return combinations.sort(fitSorter);
  }

  function allCombinations(tokensVariant, propertySize, propertiesCount, level) {
    var differenceVariants = [[tokensVariant, sizeDifference(tokensVariant, propertySize, propertiesCount)]];
    if (tokensVariant.length > 2 && level > 0) {
      for (var i = tokensVariant.length - 1; i >= 0; i--) {
        var subVariant = Array.prototype.slice.call(tokensVariant, 0);
        subVariant.splice(i, 1);
        differenceVariants = differenceVariants.concat(allCombinations(subVariant, propertySize, propertiesCount, level - 1));
      }
    }

    return differenceVariants;
  }

  function sizeDifference(tokensVariant, propertySize, propertiesCount) {
    var allSelectorsSize = 0;
    for (var i = tokensVariant.length - 1; i >= 0; i--) {
      allSelectorsSize += tokensVariant[i][2].length > propertiesCount ? stringifySelectors(tokensVariant[i][1]).length : -1;
    }
    return allSelectorsSize - (tokensVariant.length - 1) * propertySize + 1;
  }

  function dropAsNewTokenAt(position, properties, allSelectors, mergeableTokens) {
    var i, j, k, m;
    var allProperties = [];

    for (i = mergeableTokens.length - 1; i >= 0; i--) {
      var mergeableToken = mergeableTokens[i];

      for (j = mergeableToken[2].length - 1; j >= 0; j--) {
        var mergeableProperty = mergeableToken[2][j];

        for (k = 0, m = properties.length; k < m; k++) {
          var property = properties[k];

          var mergeablePropertyName = mergeableProperty[0][0];
          var propertyName = property[0];
          var propertyBody = property[4];
          if (mergeablePropertyName == propertyName && stringifyBody([mergeableProperty]) == propertyBody) {
            mergeableToken[2].splice(j, 1);
            break;
          }
        }
      }
    }

    for (i = properties.length - 1; i >= 0; i--) {
      allProperties.push(properties[i][3]);
    }

    var newToken = ['selector', allSelectors, allProperties];
    tokens.splice(position, 0, newToken);
  }

  function dropPropertiesAt(position, movedProperty) {
    var key = movedProperty[4];
    var toMove = movableTokens[key];

    if (toMove && toMove.length > 1) {
      if (!shortenMultiMovesIfPossible(position, movedProperty))
        shortenIfPossible(position, movedProperty);
    }
  }

  function shortenMultiMovesIfPossible(position, movedProperty) {
    var candidates = [];
    var propertiesAndMergableTokens = [];
    var key = movedProperty[4];
    var j, k;

    var mergeableTokens = tokensToMerge(movableTokens[key]);
    if (mergeableTokens.length < 2)
      return;

    movableLoop:
    for (var value in movableTokens) {
      var tokensList = movableTokens[value];

      for (j = mergeableTokens.length - 1; j >= 0; j--) {
        if (tokensList.indexOf(mergeableTokens[j]) == -1)
          continue movableLoop;
      }

      candidates.push(value);
    }

    if (candidates.length < 2)
      return false;

    for (j = candidates.length - 1; j >= 0; j--) {
      for (k = movedProperties.length - 1; k >= 0; k--) {
        if (movedProperties[k][4] == candidates[j]) {
          propertiesAndMergableTokens.unshift([movedProperties[k], mergeableTokens]);
          break;
        }
      }
    }

    return processMultiPropertyMove(position, propertiesAndMergableTokens);
  }

  function processMultiPropertyMove(position, propertiesAndMergableTokens) {
    var valueSize = 0;
    var properties = [];
    var property;

    for (var i = propertiesAndMergableTokens.length - 1; i >= 0; i--) {
      property = propertiesAndMergableTokens[i][0];
      var fullValue = property[4];
      valueSize += fullValue.length + (i > 0 ? 1 : 0);

      properties.push(property);
    }

    var mergeableTokens = propertiesAndMergableTokens[0][1];
    var bestFit = findAllFits(mergeableTokens, valueSize, properties.length)[0];
    if (bestFit[1] > 0)
      return false;

    var allSelectors = [];
    var qualifiedTokens = [];
    for (i = bestFit[0].length - 1; i >= 0; i--) {
      allSelectors = bestFit[0][i][1].concat(allSelectors);
      qualifiedTokens.unshift(bestFit[0][i]);
    }

    allSelectors = CleanUp.selectorDuplicates(allSelectors);
    dropAsNewTokenAt(position, properties, allSelectors, qualifiedTokens);

    for (i = properties.length - 1; i >= 0; i--) {
      property = properties[i];
      var index = movedProperties.indexOf(property);

      delete movableTokens[property[4]];

      if (index > -1 && movedToBeDropped.indexOf(index) == -1)
        movedToBeDropped.push(index);
    }

    return true;
  }

  function boundToAnotherPropertyInCurrrentToken(property, movedProperty, token) {
    var propertyName = property[0];
    var movedPropertyName = movedProperty[0];
    if (propertyName != movedPropertyName)
      return false;

    var key = movedProperty[4];
    var toMove = movableTokens[key];
    return toMove && toMove.indexOf(token) > -1;
  }

  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];
    var isSelector;
    var j, k, m;

    if (token[0] == 'selector') {
      isSelector = true;
    } else if (token[0] == 'block') {
      isSelector = false;
    } else {
      continue;
    }

    // We cache movedProperties.length as it may change in the loop
    var movedCount = movedProperties.length;

    var properties = extractProperties(token);
    movedToBeDropped = [];

    var unmovableInCurrentToken = [];
    for (j = properties.length - 1; j >= 0; j--) {
      for (k = j - 1; k >= 0; k--) {
        if (!canReorderSingle(properties[j], properties[k])) {
          unmovableInCurrentToken.push(j);
          break;
        }
      }
    }

    for (j = 0, m = properties.length; j < m; j++) {
      var property = properties[j];
      var movedSameProperty = false;

      for (k = 0; k < movedCount; k++) {
        var movedProperty = movedProperties[k];

        if (movedToBeDropped.indexOf(k) == -1 && !canReorderSingle(property, movedProperty) && !boundToAnotherPropertyInCurrrentToken(property, movedProperty, token)) {
          dropPropertiesAt(i + 1, movedProperty, token);

          if (movedToBeDropped.indexOf(k) == -1) {
            movedToBeDropped.push(k);
            delete movableTokens[movedProperty[4]];
          }
        }

        if (!movedSameProperty)
          movedSameProperty = property[0] == movedProperty[0] && property[1] == movedProperty[1];
      }

      if (!isSelector || unmovableInCurrentToken.indexOf(j) > -1)
        continue;

      var key = property[4];
      movableTokens[key] = movableTokens[key] || [];
      movableTokens[key].push(token);

      if (!movedSameProperty)
        movedProperties.push(property);
    }

    movedToBeDropped = movedToBeDropped.sort(naturalSorter);
    for (j = 0, m = movedToBeDropped.length; j < m; j++) {
      var dropAt = movedToBeDropped[j] - j;
      movedProperties.splice(dropAt, 1);
    }
  }

  var position = tokens[0] && tokens[0][0] == 'at-rule' && tokens[0][1][0].indexOf('@charset') === 0 ? 1 : 0;
  for (; position < tokens.length - 1; position++) {
    var isImportRule = tokens[position][0] === 'at-rule' && tokens[position][1][0].indexOf('@import') === 0;
    var isEscapedCommentSpecial = tokens[position][0] === 'text' && tokens[position][1][0].indexOf('__ESCAPED_COMMENT_SPECIAL') === 0;
    if (!(isImportRule || isEscapedCommentSpecial))
      break;
  }

  for (i = 0; i < movedProperties.length; i++) {
    dropPropertiesAt(position, movedProperties[i]);
  }
};

AdvancedOptimizer.prototype.removeDuplicateMediaQueries = function (tokens) {
  var candidates = {};

  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];
    if (token[0] != 'block')
      continue;

    var key = token[1][0] + '%' + stringifyAll(token[2]);
    var candidate = candidates[key];

    if (candidate)
      candidate[2] = [];

    candidates[key] = token;
  }
};

AdvancedOptimizer.prototype.mergeMediaQueries = function (tokens) {
  var candidates = {};
  var reduced = [];

  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];
    if (token[0] != 'block')
      continue;

    var candidate = candidates[token[1][0]];
    if (!candidate) {
      candidate = [];
      candidates[token[1][0]] = candidate;
    }

    candidate.push(i);
  }

  for (var name in candidates) {
    var positions = candidates[name];

    positionLoop:
    for (var j = positions.length - 1; j > 0; j--) {
      var source = tokens[positions[j]];
      var target = tokens[positions[j - 1]];
      var movedProperties = extractProperties(source);

      for (var k = positions[j] + 1; k < positions[j - 1]; k++) {
        var traversedProperties = extractProperties(tokens[k]);

        // moved then traversed as we move @media towards the end
        if (!canReorder(movedProperties, traversedProperties))
          continue positionLoop;
      }

      target[2] = source[2].concat(target[2]);
      source[2] = [];

      reduced.push(target);
    }
  }

  return reduced;
};

AdvancedOptimizer.prototype.removeEmpty = function (tokens) {
  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];
    var isEmpty = false;

    switch (token[0]) {
      case 'selector':
        isEmpty = token[1].length === 0 || token[2].length === 0;
        break;
      case 'block':
        this.removeEmpty(token[2]);
        isEmpty = token[2].length === 0;
    }

    if (isEmpty) {
      tokens.splice(i, 1);
      i--;
      l--;
    }
  }
};

function recursivelyOptimizeProperties(tokens, options, validator) {
  for (var i = 0, l = tokens.length; i < l; i++) {
    var token = tokens[i];

    switch (token[0]) {
      case 'selector':
        optimizeProperties(token[1], token[2], false, true, options, validator);
        break;
      case 'block':
        recursivelyOptimizeProperties(token[2], options, validator);
    }
  }
}

AdvancedOptimizer.prototype.optimize = function (tokens) {
  var self = this;

  function _optimize(tokens, withRestructuring) {
    tokens.forEach(function (token) {
      if (token[0] == 'block') {
        var isKeyframes = /@(-moz-|-o-|-webkit-)?keyframes/.test(token[1][0]);
        _optimize(token[2], !isKeyframes);
      }
    });

    recursivelyOptimizeProperties(tokens, self.options, self.validator);

    self.removeDuplicates(tokens);
    self.mergeAdjacent(tokens);
    self.reduceNonAdjacent(tokens);

    self.mergeNonAdjacentBySelector(tokens);
    self.mergeNonAdjacentByBody(tokens);

    if (self.options.restructuring && withRestructuring) {
      self.restructure(tokens);
      self.mergeAdjacent(tokens);
    }

    if (self.options.mediaMerging) {
      self.removeDuplicateMediaQueries(tokens);
      var reduced = self.mergeMediaQueries(tokens);
      for (var i = reduced.length - 1; i >= 0; i--) {
        _optimize(reduced[i][2]);
      }
    }

    self.removeEmpty(tokens);
  }

  _optimize(tokens, true);
};

module.exports = AdvancedOptimizer;
