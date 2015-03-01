// Copyright (C) 2008-2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * Client-side HTML schema interface library.
 *
 * @author kpreid@switchb.org
 * @requires cajaVM, html4
 * @provides HtmlSchema, htmlSchema
 * @overrides window
 */

var HtmlSchema = (function() {
  'use strict';

  function HtmlSchema_(html4) {
    var ELEMENTS = html4.ELEMENTS;
    var ELEMENT_DOM_INTERFACES = html4.ELEMENT_DOM_INTERFACES;
    var ATTRIBS = html4.ATTRIBS;
    var URIEFFECTS = html4.URIEFFECTS;
    var LOADERTYPES = html4.LOADERTYPES;
    var OPTIONAL_ENDTAG = html4.eflags.OPTIONAL_ENDTAG;
    var EMPTY = html4.eflags.EMPTY;
    var CDATA = html4.eflags.CDATA;
    var RCDATA = html4.eflags.RCDATA;
    var UNSAFE = html4.eflags.UNSAFE;
    var VIRTUALIZED = html4.eflags.VIRTUALIZED;
    var unknownElementInterface = "HTMLUnknownElement";

    var hop = Object.prototype.hasOwnProperty;

    var elemCache = {};
    var attrCache = {};
    var scriptInterfacesCache;

    var unknownElementEntry = cajaVM.def({
      allowed: false,
      isVirtualizedElementName: false,
      shouldVirtualize: true,
      empty: false,
      optionalEndTag: false,
      contentIsCDATA: false,
      contentIsRCDATA: false,
      domInterface: unknownElementInterface
    });

    var unknownAttributeEntry = cajaVM.def({
      type: undefined,
      loaderType: undefined,
      uriEffect: undefined
    });

    function makeAttributeFromSchema(attribKey) {
      return cajaVM.def({
        type: ATTRIBS[attribKey],
        loaderType: LOADERTYPES[attribKey],
        uriEffect: URIEFFECTS[attribKey]
      });
    }

    var VIRTUALIZED_ELEMENT_NAME_RE = /^caja-v-(.*)$/i;
    var VIRTUALIZED_ELEMENT_PREFIX = 'caja-v-';
    function isVirtualizedElementName(elementName) {
      return VIRTUALIZED_ELEMENT_NAME_RE.test(elementName);
    }
    function realToVirtualElementName(elementName) {
      var match = VIRTUALIZED_ELEMENT_NAME_RE.exec(elementName);
      return match ? match[1] : elementName;
    }
    function virtualToRealElementName(elementName) {
      if (htmlSchema.element(elementName).shouldVirtualize) {
        return VIRTUALIZED_ELEMENT_PREFIX + elementName;
      } else {
        return elementName;
      }
    }

    var htmlSchema = cajaVM.def({
      // may receive virtualized element names
      element: function(elementName) {
        if (typeof elementName !== 'string') {
          throw new Error('non-string ' + elementName + ' got to htmlSchema');
        }
        elementName = elementName.toLowerCase();

        var cacheKey = elementName + '$';
        if (cacheKey in elemCache) {
          return elemCache[cacheKey];
        } else {
          var entry;
          if (Object.prototype.hasOwnProperty.call(ELEMENTS, elementName)) {
            var eflags = ELEMENTS[elementName];
            entry = cajaVM.def({
              allowed: !(eflags & UNSAFE),
              isVirtualizedElementName: false,
              shouldVirtualize: !!(eflags & VIRTUALIZED),
              empty: !!(eflags & EMPTY),
              optionalEndTag: !!(eflags & OPTIONAL_ENDTAG),
              contentIsCDATA: !!(eflags & CDATA),
              contentIsRCDATA: !!(eflags & RCDATA),
              domInterface: ELEMENT_DOM_INTERFACES[elementName]
            });
          } else if (isVirtualizedElementName(elementName)) {
            var unvirtEntry =
                htmlSchema.element(realToVirtualElementName(elementName));
            entry = cajaVM.def({
              allowed: true,
              isVirtualizedElementName: true,
              shouldVirtualize: false,
              empty: false,
              optionalEndTag: false,
              contentIsCDATA: false,
              contentIsRCDATA: false,
              domInterface: unvirtEntry.domInterface
            });
          } else {
            entry = unknownElementEntry;
          }
          return elemCache[cacheKey] = entry;
        }
      },

      // should not receive virtualized attribute names
      attribute: function(elementName, attribName) {
        if (typeof elementName !== 'string') {
          throw new Error('Domado internal: ' +
              'non-string ' + elementName + ' got to HtmlSchema');
        }
        if (typeof attribName !== 'string') {
          throw new Error('Domado internal: ' +
              'non-string ' + attribName + ' got to HtmlSchema');
        }
        elementName = elementName.toLowerCase();
        attribName = attribName.toLowerCase();

        var attribKey = elementName + '::' + attribName;
        if (attribKey in attrCache) {
          return attrCache[attribKey];
        } else {
          var entry;
          if (ATTRIBS.hasOwnProperty(attribKey)) {
            entry = makeAttributeFromSchema(attribKey);
          } else {
            var wildKey = '*::' + attribName;
            if (ATTRIBS.hasOwnProperty(wildKey)) {
              entry = makeAttributeFromSchema(wildKey);
            } else {
              entry = unknownAttributeEntry;
            }
          }
          return attrCache[attribKey] = entry;
        }
      },

      isVirtualizedElementName: isVirtualizedElementName,
      realToVirtualElementName: realToVirtualElementName,
      virtualToRealElementName: virtualToRealElementName,

      getAllKnownScriptInterfaces: function() {
        if (!scriptInterfacesCache) {
          var table = {};
          for (var el in ELEMENT_DOM_INTERFACES) {
            if (hop.call(ELEMENT_DOM_INTERFACES, el)) {
              table[ELEMENT_DOM_INTERFACES[el]] = true;
            }
          }
          scriptInterfacesCache = cajaVM.def(Object.getOwnPropertyNames(table));
        }
        return scriptInterfacesCache;
      }
    });

    return htmlSchema;
  }

  return HtmlSchema_;
})();

// TODO(kpreid): Refactor this into parameters.
var htmlSchema = new HtmlSchema(html4);

// Exports for closure compiler.
if (typeof window !== 'undefined') {
  window['HtmlSchema'] = HtmlSchema;
  window['htmlSchema'] = htmlSchema;
}

