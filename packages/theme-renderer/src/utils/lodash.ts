/**
 * Package-local lodash surface (worker-readiness, review-backlog §Worker-readiness).
 *
 * The ported files were written against `import _ from 'lodash'`, which drags
 * the entire library (~25KB gz) into the browser/worker bundle. This module
 * re-exports exactly the methods the package uses, each via its CJS subpath
 * (which pulls only that method's internal dependency graph), and presents
 * them under the familiar `_` default export — so the ported files' change
 * stays import-line-only and every `_.foo` call site remains byte-identical
 * to its ghost/core origin (docs/provenance.md).
 *
 * When a newly ported file needs another method, add its subpath import here —
 * do NOT import the lodash root anywhere in src/.
 */
import assign from 'lodash/assign.js';
import cloneDeep from 'lodash/cloneDeep.js';
import defaults from 'lodash/defaults.js';
import each from 'lodash/each.js';
import escape from 'lodash/escape.js';
import extend from 'lodash/extend.js';
import filter from 'lodash/filter.js';
import find from 'lodash/find.js';
import findIndex from 'lodash/findIndex.js';
import findLastIndex from 'lodash/findLastIndex.js';
import forEach from 'lodash/forEach.js';
import get from 'lodash/get.js';
import has from 'lodash/has.js';
import identity from 'lodash/identity.js';
import includes from 'lodash/includes.js';
import indexOf from 'lodash/indexOf.js';
import isArray from 'lodash/isArray.js';
import isBoolean from 'lodash/isBoolean.js';
import isDate from 'lodash/isDate.js';
import isEmpty from 'lodash/isEmpty.js';
import isFinite from 'lodash/isFinite.js';
import isFunction from 'lodash/isFunction.js';
import isNull from 'lodash/isNull.js';
import isNumber from 'lodash/isNumber.js';
import isObject from 'lodash/isObject.js';
import isString from 'lodash/isString.js';
import isUndefined from 'lodash/isUndefined.js';
import keys from 'lodash/keys.js';
import map from 'lodash/map.js';
import mapValues from 'lodash/mapValues.js';
import merge from 'lodash/merge.js';
import omit from 'lodash/omit.js';
import pick from 'lodash/pick.js';
import reduce from 'lodash/reduce.js';
import reduceRight from 'lodash/reduceRight.js';
import size from 'lodash/size.js';
import some from 'lodash/some.js';
import template from 'lodash/template.js';
import toString from 'lodash/toString.js';
// Type-only root import (erased at build time — no bundle impact): the
// explicit annotation keeps declaration emit from leaking the subpath d.ts'
// private names (TS4082).
import type {LoDashStatic} from 'lodash';

const _: Pick<LoDashStatic,
    'assign' | 'cloneDeep' | 'defaults' | 'each' | 'escape' | 'extend' |
    'filter' | 'find' | 'findIndex' | 'findLastIndex' | 'forEach' | 'get' |
    'has' | 'identity' | 'includes' | 'indexOf' | 'isArray' | 'isBoolean' |
    'isDate' | 'isEmpty' | 'isFinite' | 'isFunction' | 'isNull' | 'isNumber' |
    'isObject' | 'isString' | 'isUndefined' | 'keys' | 'map' | 'mapValues' |
    'merge' | 'omit' | 'pick' | 'reduce' | 'reduceRight' | 'size' | 'some' |
    'template' | 'toString'
> = {
    assign,
    cloneDeep,
    defaults,
    each,
    escape,
    extend,
    filter,
    find,
    findIndex,
    findLastIndex,
    forEach,
    get,
    has,
    identity,
    includes,
    indexOf,
    isArray,
    isBoolean,
    isDate,
    isEmpty,
    isFinite,
    isFunction,
    isNull,
    isNumber,
    isObject,
    isString,
    isUndefined,
    keys,
    map,
    mapValues,
    merge,
    omit,
    pick,
    reduce,
    reduceRight,
    size,
    some,
    template,
    toString
};

export default _;
