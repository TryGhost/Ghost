/*! jQuery plugin for Hammer.JS - v1.0.1 - 2014-02-03
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */
!function(a,b){"use strict";function c(a,c){a.event.bindDom=function(a,d,e){c(a).on(d,function(a){var c=a.originalEvent||a;c.pageX===b&&(c.pageX=a.pageX,c.pageY=a.pageY),c.target||(c.target=a.target),c.which===b&&(c.which=c.button),c.preventDefault||(c.preventDefault=a.preventDefault),c.stopPropagation||(c.stopPropagation=a.stopPropagation),e.call(this,c)})},a.Instance.prototype.on=function(a,b){return c(this.element).on(a,b)},a.Instance.prototype.off=function(a,b){return c(this.element).off(a,b)},a.Instance.prototype.trigger=function(a,b){var d=c(this.element);return d.has(b.target).length&&(d=c(b.target)),d.trigger({type:a,gesture:b})},c.fn.hammer=function(b){return this.each(function(){var d=c(this),e=d.data("hammer");e?e&&b&&a.utils.extend(e.options,b):d.data("hammer",new a(this,b||{}))})}}"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(["hammerjs","jquery"],c):c(a.Hammer,a.jQuery||a.Zepto)}(this);
//# sourceMappingURL=jquery.hammer.min.map