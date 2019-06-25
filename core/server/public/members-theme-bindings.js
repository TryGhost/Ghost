(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MembersThemeBindings = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
var root = require('./_root');
var Symbol = root.Symbol;
module.exports = Symbol;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_Symbol.js
},{"./_root":24}],2:[function(require,module,exports){
"use strict";
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;
  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}
module.exports = arrayEach;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_arrayEach.js
},{}],3:[function(require,module,exports){
"use strict";
var baseTimes = require('./_baseTimes'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isIndex = require('./_isIndex'),
    isTypedArray = require('./isTypedArray');
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;
  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (key == 'length' || (isBuff && (key == 'offset' || key == 'parent')) || (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) || isIndex(key, length)))) {
      result.push(key);
    }
  }
  return result;
}
module.exports = arrayLikeKeys;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_arrayLikeKeys.js
},{"./_baseTimes":11,"./_isIndex":18,"./isArguments":28,"./isArray":29,"./isBuffer":31,"./isTypedArray":36}],4:[function(require,module,exports){
"use strict";
var baseForOwn = require('./_baseForOwn'),
    createBaseEach = require('./_createBaseEach');
var baseEach = createBaseEach(baseForOwn);
module.exports = baseEach;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseEach.js
},{"./_baseForOwn":6,"./_createBaseEach":14}],5:[function(require,module,exports){
"use strict";
var createBaseFor = require('./_createBaseFor');
var baseFor = createBaseFor();
module.exports = baseFor;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseFor.js
},{"./_createBaseFor":15}],6:[function(require,module,exports){
"use strict";
var baseFor = require('./_baseFor'),
    keys = require('./keys');
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}
module.exports = baseForOwn;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseForOwn.js
},{"./_baseFor":5,"./keys":37}],7:[function(require,module,exports){
"use strict";
var Symbol = require('./_Symbol'),
    getRawTag = require('./_getRawTag'),
    objectToString = require('./_objectToString');
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value)) ? getRawTag(value) : objectToString(value);
}
module.exports = baseGetTag;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseGetTag.js
},{"./_Symbol":1,"./_getRawTag":17,"./_objectToString":22}],8:[function(require,module,exports){
"use strict";
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');
var argsTag = '[object Arguments]';
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}
module.exports = baseIsArguments;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseIsArguments.js
},{"./_baseGetTag":7,"./isObjectLike":35}],9:[function(require,module,exports){
"use strict";
var baseGetTag = require('./_baseGetTag'),
    isLength = require('./isLength'),
    isObjectLike = require('./isObjectLike');
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';
var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
function baseIsTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}
module.exports = baseIsTypedArray;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseIsTypedArray.js
},{"./_baseGetTag":7,"./isLength":33,"./isObjectLike":35}],10:[function(require,module,exports){
"use strict";
var isPrototype = require('./_isPrototype'),
    nativeKeys = require('./_nativeKeys');
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}
module.exports = baseKeys;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseKeys.js
},{"./_isPrototype":19,"./_nativeKeys":20}],11:[function(require,module,exports){
"use strict";
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);
  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}
module.exports = baseTimes;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseTimes.js
},{}],12:[function(require,module,exports){
"use strict";
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}
module.exports = baseUnary;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_baseUnary.js
},{}],13:[function(require,module,exports){
"use strict";
var identity = require('./identity');
function castFunction(value) {
  return typeof value == 'function' ? value : identity;
}
module.exports = castFunction;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_castFunction.js
},{"./identity":27}],14:[function(require,module,exports){
"use strict";
var isArrayLike = require('./isArrayLike');
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    if (collection == null) {
      return collection;
    }
    if (!isArrayLike(collection)) {
      return eachFunc(collection, iteratee);
    }
    var length = collection.length,
        index = fromRight ? length : -1,
        iterable = Object(collection);
    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}
module.exports = createBaseEach;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_createBaseEach.js
},{"./isArrayLike":30}],15:[function(require,module,exports){
"use strict";
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;
    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}
module.exports = createBaseFor;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_createBaseFor.js
},{}],16:[function(require,module,exports){
(function (global){
"use strict";
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;
module.exports = freeGlobal;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_freeGlobal.js
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],17:[function(require,module,exports){
"use strict";
var Symbol = require('./_Symbol');
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
var nativeObjectToString = objectProto.toString;
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];
  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}
  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}
module.exports = getRawTag;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_getRawTag.js
},{"./_Symbol":1}],18:[function(require,module,exports){
"use strict";
var MAX_SAFE_INTEGER = 9007199254740991;
var reIsUint = /^(?:0|[1-9]\d*)$/;
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length && (type == 'number' || (type != 'symbol' && reIsUint.test(value))) && (value > -1 && value % 1 == 0 && value < length);
}
module.exports = isIndex;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_isIndex.js
},{}],19:[function(require,module,exports){
"use strict";
var objectProto = Object.prototype;
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;
  return value === proto;
}
module.exports = isPrototype;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_isPrototype.js
},{}],20:[function(require,module,exports){
"use strict";
var overArg = require('./_overArg');
var nativeKeys = overArg(Object.keys, Object);
module.exports = nativeKeys;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_nativeKeys.js
},{"./_overArg":23}],21:[function(require,module,exports){
"use strict";
var freeGlobal = require('./_freeGlobal');
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;
var moduleExports = freeModule && freeModule.exports === freeExports;
var freeProcess = moduleExports && freeGlobal.process;
var nodeUtil = (function() {
  try {
    var types = freeModule && freeModule.require && freeModule.require('util').types;
    if (types) {
      return types;
    }
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());
module.exports = nodeUtil;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_nodeUtil.js
},{"./_freeGlobal":16}],22:[function(require,module,exports){
"use strict";
var objectProto = Object.prototype;
var nativeObjectToString = objectProto.toString;
function objectToString(value) {
  return nativeObjectToString.call(value);
}
module.exports = objectToString;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_objectToString.js
},{}],23:[function(require,module,exports){
"use strict";
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}
module.exports = overArg;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_overArg.js
},{}],24:[function(require,module,exports){
"use strict";
var freeGlobal = require('./_freeGlobal');
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;
var root = freeGlobal || freeSelf || Function('return this')();
module.exports = root;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/_root.js
},{"./_freeGlobal":16}],25:[function(require,module,exports){
"use strict";
module.exports = require('./forEach');

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/each.js
},{"./forEach":26}],26:[function(require,module,exports){
"use strict";
var arrayEach = require('./_arrayEach'),
    baseEach = require('./_baseEach'),
    castFunction = require('./_castFunction'),
    isArray = require('./isArray');
function forEach(collection, iteratee) {
  var func = isArray(collection) ? arrayEach : baseEach;
  return func(collection, castFunction(iteratee));
}
module.exports = forEach;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/forEach.js
},{"./_arrayEach":2,"./_baseEach":4,"./_castFunction":13,"./isArray":29}],27:[function(require,module,exports){
"use strict";
function identity(value) {
  return value;
}
module.exports = identity;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/identity.js
},{}],28:[function(require,module,exports){
"use strict";
var baseIsArguments = require('./_baseIsArguments'),
    isObjectLike = require('./isObjectLike');
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
var propertyIsEnumerable = objectProto.propertyIsEnumerable;
var isArguments = baseIsArguments(function() {
  return arguments;
}()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
};
module.exports = isArguments;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isArguments.js
},{"./_baseIsArguments":8,"./isObjectLike":35}],29:[function(require,module,exports){
"use strict";
var isArray = Array.isArray;
module.exports = isArray;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isArray.js
},{}],30:[function(require,module,exports){
"use strict";
var isFunction = require('./isFunction'),
    isLength = require('./isLength');
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}
module.exports = isArrayLike;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isArrayLike.js
},{"./isFunction":32,"./isLength":33}],31:[function(require,module,exports){
"use strict";
var root = require('./_root'),
    stubFalse = require('./stubFalse');
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;
var moduleExports = freeModule && freeModule.exports === freeExports;
var Buffer = moduleExports ? root.Buffer : undefined;
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;
var isBuffer = nativeIsBuffer || stubFalse;
module.exports = isBuffer;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isBuffer.js
},{"./_root":24,"./stubFalse":38}],32:[function(require,module,exports){
"use strict";
var baseGetTag = require('./_baseGetTag'),
    isObject = require('./isObject');
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}
module.exports = isFunction;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isFunction.js
},{"./_baseGetTag":7,"./isObject":34}],33:[function(require,module,exports){
"use strict";
var MAX_SAFE_INTEGER = 9007199254740991;
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}
module.exports = isLength;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isLength.js
},{}],34:[function(require,module,exports){
"use strict";
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}
module.exports = isObject;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isObject.js
},{}],35:[function(require,module,exports){
"use strict";
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}
module.exports = isObjectLike;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isObjectLike.js
},{}],36:[function(require,module,exports){
"use strict";
var baseIsTypedArray = require('./_baseIsTypedArray'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
module.exports = isTypedArray;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/isTypedArray.js
},{"./_baseIsTypedArray":9,"./_baseUnary":12,"./_nodeUtil":21}],37:[function(require,module,exports){
"use strict";
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeys = require('./_baseKeys'),
    isArrayLike = require('./isArrayLike');
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}
module.exports = keys;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/keys.js
},{"./_arrayLikeKeys":3,"./_baseKeys":10,"./isArrayLike":30}],38:[function(require,module,exports){
"use strict";
function stubFalse() {
  return false;
}
module.exports = stubFalse;

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/lodash/stubFalse.js
},{}],39:[function(require,module,exports){
"use strict";
module.exports = function(n) {
  var t = {},
      e = [];
  n = n || this, n.on = function(e, r, l) {
    return (t[e] = t[e] || []).push([r, l]), n;
  }, n.off = function(r, l) {
    r || (t = {});
    for (var o = t[r] || e,
        u = o.length = l ? o.length : 0; u--; )
      l == o[u][0] && o.splice(u, 1);
    return n;
  }, n.emit = function(r) {
    for (var l,
        o = t[r] || e,
        u = o.length > 0 ? o.slice(0, o.length) : o,
        i = 0; l = u[i++]; )
      l[0].apply(l[1], e.slice.call(arguments, 1));
    return n;
  };
};

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/minivents/dist/minivents.commonjs.min.js
},{}],40:[function(require,module,exports){
"use strict";
var gatewayApi = require('@tryghost/members-gateway-api');
module.exports = function layer2(options) {
  var authUrl = (options.membersUrl + "/auth");
  var gatewayUrl = (options.membersUrl + "/gateway");
  var container = options.container;
  var members = gatewayApi({
    gatewayUrl: gatewayUrl,
    container: container
  });
  var loadAuth = loadFrame(authUrl, container).then(function(frame) {
    frame.style.position = 'fixed';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.background = 'transparent';
    frame.style.top = '0';
    frame.style['z-index'] = '9999';
    return frame;
  });
  function openAuth(hash) {
    var query = arguments[1] !== (void 0) ? arguments[1] : '';
    return loadAuth.then(function(frame) {
      return new Promise(function(resolve) {
        frame.src = (authUrl + "#" + hash + "?" + query);
        frame.style.display = 'block';
        window.addEventListener('message', function messageListener(event) {
          if (event.source !== frame.contentWindow) {
            return;
          }
          if (!event.data || event.data.msg !== 'pls-close-auth-popup') {
            return;
          }
          window.removeEventListener('message', messageListener);
          frame.style.display = 'none';
          resolve(!!event.data.success);
        });
      });
    });
  }
  function resetPassword($__0) {
    var token = $__0.token;
    var query = ("token=" + token);
    return openAuth('reset-password', query);
  }
  function signin() {
    return openAuth('signin');
  }
  function upgrade() {
    return openAuth('upgrade');
  }
  function signup() {
    var coupon = (arguments[0] !== (void 0) ? arguments[0] : {}).coupon;
    var query = ("coupon=" + coupon);
    return openAuth('signup', query);
  }
  function getToken($__0) {
    var $__1 = $__0,
        audience = $__1.audience,
        fresh = $__1.fresh;
    return members.getToken({
      audience: audience,
      fresh: fresh
    });
  }
  function getSSRToken() {
    var fresh = (arguments[0] !== (void 0) ? arguments[0] : {}).fresh;
    return members.getConfig().then(function($__1) {
      var issuer = $__1.issuer;
      return members.getToken({
        audience: issuer,
        fresh: fresh
      });
    });
  }
  function signout() {
    return members.signout();
  }
  return Object.assign(members.bus, {
    getToken: getToken,
    getSSRToken: getSSRToken,
    signout: signout,
    signin: signin,
    signup: signup,
    upgrade: upgrade,
    resetPassword: resetPassword
  });
};
function loadFrame(src) {
  var container = arguments[1] !== (void 0) ? arguments[1] : document.body;
  return new Promise(function(resolve) {
    var frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = src;
    frame.onload = function() {
      resolve(frame);
    };
    container.appendChild(frame);
  });
}

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/@tryghost/members-browser-auth/index.js
},{"@tryghost/members-gateway-api":41}],41:[function(require,module,exports){
"use strict";
var gatewayProtocol = require('@tryghost/members-gateway-protocol');
var events = require('minivents');
module.exports = function layer1(options) {
  var members = {
    getToken: getToken,
    getConfig: getConfig,
    signout: signout,
    signin: signin,
    signup: signup,
    requestPasswordReset: requestPasswordReset,
    resetPassword: resetPassword,
    bus: new events()
  };
  var loadGateway = loadFrame(options.gatewayUrl, options.container).then(function(frame) {
    var gateway = gatewayProtocol(frame);
    var init = gatewayFn('init');
    gateway.listen(function(data) {
      members.bus.emit(data.event, data.payload);
    });
    return init(gateway).then(function() {
      return gateway;
    });
  });
  function getToken($__0) {
    var $__1 = $__0,
        audience = $__1.audience,
        fresh = $__1.fresh;
    return loadGateway.then(gatewayFn('getToken', {
      audience: audience,
      fresh: fresh
    }));
  }
  function getConfig() {
    return loadGateway.then(gatewayFn('getConfig'));
  }
  function signout() {
    return loadGateway.then(gatewayFn('signout'));
  }
  function signin($__0) {
    var $__1 = $__0,
        email = $__1.email,
        password = $__1.password;
    return loadGateway.then(gatewayFn('signin', {
      email: email,
      password: password
    }));
  }
  function signup($__0) {
    var $__1 = $__0,
        name = $__1.name,
        email = $__1.email,
        password = $__1.password;
    return loadGateway.then(gatewayFn('signin', {
      name: name,
      email: email,
      password: password
    }));
  }
  function requestPasswordReset($__0) {
    var email = $__0.email;
    return loadGateway.then(gatewayFn('request-password-reset', {email: email}));
  }
  function resetPassword($__0) {
    var $__1 = $__0,
        token = $__1.token,
        password = $__1.password;
    return loadGateway.then(gatewayFn('reset-password', {
      token: token,
      password: password
    }));
  }
  return members;
};
function gatewayFn(method) {
  var opts = arguments[1] !== (void 0) ? arguments[1] : {};
  return function(gateway) {
    return new Promise(function(resolve, reject) {
      gateway.call(method, opts, function(err, res) {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
  };
}
function loadFrame(src) {
  var container = arguments[1] !== (void 0) ? arguments[1] : document.body;
  return new Promise(function(resolve) {
    var frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = src;
    frame.onload = function() {
      resolve(frame);
    };
    container.appendChild(frame);
  });
}

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/@tryghost/members-gateway-api/index.js
},{"@tryghost/members-gateway-protocol":42,"minivents":39}],42:[function(require,module,exports){
"use strict";
module.exports = function layer0(frame) {
  var getuid = (function(i) {
    return function() {
      return i += 1;
    };
  })(1);
  var origin = new URL(frame.getAttribute('src')).origin;
  var handlers = {};
  var listener = null;
  window.addEventListener('message', function(event) {
    if (event.origin !== origin) {
      return;
    }
    if (!event.data || !event.data.uid) {
      if (event.data.event) {
        return listener && listener(event.data);
      }
      return;
    }
    var handler = handlers[event.data.uid];
    if (!handler) {
      return;
    }
    delete handlers[event.data.uid];
    handler(event.data.error, event.data.data);
  });
  function call(method, options, cb) {
    var uid = getuid();
    var data = {
      uid: uid,
      method: method,
      options: options
    };
    handlers[uid] = cb;
    frame.contentWindow.postMessage(data, origin);
  }
  function listen(fn) {
    if (listener) {
      return false;
    }
    listener = fn;
    return true;
  }
  return {
    call: call,
    listen: listen
  };
};

//# sourceURL=/home/donny/usr/src/ghost.org/Members/node_modules/@tryghost/members-gateway-protocol/index.js
},{}],43:[function(require,module,exports){
"use strict";
var each = require('lodash/each');
var browserAuth = require('@tryghost/members-browser-auth');
module.exports.init = init;
function init($__0) {
  var $__1 = $__0,
      membersUrl = $__1.membersUrl,
      ssrUrl = $__1.ssrUrl;
  var auth = browserAuth({membersUrl: membersUrl});
  var $__2 = window.location.hash.match(/^#([^?]+)\??(.*)$/) || [],
      hashMatch = $__2[0],
      hash = $__2[1],
      query = $__2[2];
  if (hashMatch && hash === 'reset-password') {
    var $__3 = query.match(/token=([a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+.[a-zA-Z0-9-_]+)/) || [],
        tokenMatch = $__3[0],
        token = $__3[1];
    if (tokenMatch) {
      return auth.resetPassword({token: token}).then((function(success) {
        window.location.hash = '';
        return success;
      })).then(reload);
    }
  }
  auth.on('signedin', function() {
    auth.getSSRToken({fresh: true}).then(function(token) {
      createSession(token, ssrUrl);
    });
  });
  auth.on('signedout', function() {
    destroySession();
  });
  function signout() {
    auth.signout().then((function() {
      return destroySession(ssrUrl);
    })).then(reload);
  }
  function signin() {
    auth.signin().then((function() {
      return auth.getSSRToken({fresh: true}).then(function(token) {
        return createSession(token, ssrUrl);
      });
    })).then(reload);
  }
  function signup($__4) {
    var $__6;
    var $__5 = $__4,
        coupon = ($__6 = $__5.coupon) === void 0 ? '' : $__6;
    auth.signup({coupon: coupon}).then((function() {
      return auth.getSSRToken({fresh: true}).then(function(token) {
        return createSession(token, ssrUrl);
      });
    })).then(reload);
  }
  function upgrade() {
    auth.upgrade().then((function() {
      return auth.getSSRToken({fresh: true}).then(function(token) {
        return createSession(token, ssrUrl);
      });
    })).then(reload);
  }
  var signinEls = document.querySelectorAll('[data-members-signin]');
  var signupEls = document.querySelectorAll('[data-members-signup]');
  var upgradeEls = document.querySelectorAll('[data-members-upgrade]');
  var signoutEls = document.querySelectorAll('[data-members-signout]');
  each(signinEls, (function(el) {
    el.addEventListener('click', (function(event) {
      event.preventDefault();
      signin();
    }));
  }));
  each(signupEls, (function(el) {
    el.addEventListener('click', (function(event) {
      event.preventDefault();
      var coupon = el.dataset.membersCoupon;
      signup({coupon: coupon});
    }));
  }));
  each(upgradeEls, (function(el) {
    el.addEventListener('click', (function(event) {
      event.preventDefault();
      upgrade();
    }));
  }));
  each(signoutEls, (function(el) {
    el.addEventListener('click', (function(event) {
      event.preventDefault();
      signout();
    }));
  }));
}
function reload(success) {
  if (success) {
    window.location.reload();
  }
}
function createSession(token, ssrUrl) {
  return fetch(ssrUrl, {
    method: 'post',
    credentials: 'include',
    body: token
  }).then(function(res) {
    return !!res.ok;
  });
}
function destroySession(ssrUrl) {
  return fetch(ssrUrl, {method: 'delete'}).then(function(res) {
    return !!res.ok;
  });
}

//# sourceURL=/home/donny/usr/src/ghost.org/Members/packages/members-theme-bindings/index.js
},{"@tryghost/members-browser-auth":40,"lodash/each":25}]},{},[43])(43)
});
