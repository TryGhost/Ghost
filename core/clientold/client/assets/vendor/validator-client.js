/*!
 * Copyright (c) 2010 Chris O'Hara <cohara87@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// follow Universal Module Definition (UMD) pattern for defining module as AMD, CommonJS, and Browser compatible
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        // N.B. Here is a slight difference to regular UMD as the current API for node-validator in browser adds each export directly to the window
        // rather than to a namespaced object such as window.nodeValidator, which would be better practice, but would break backwards compatibility
        // as such unable to use build tools like grunt-umd
        factory(root);
    }
}(this, function(exports) {

    var entities = {
        '&nbsp;': '\u00a0',
        '&iexcl;': '\u00a1',
        '&cent;': '\u00a2',
        '&pound;': '\u00a3',
        '&curren;': '\u20ac',
        '&yen;': '\u00a5',
        '&brvbar;': '\u0160',
        '&sect;': '\u00a7',
        '&uml;': '\u0161',
        '&copy;': '\u00a9',
        '&ordf;': '\u00aa',
        '&laquo;': '\u00ab',
        '&not;': '\u00ac',
        '&shy;': '\u00ad',
        '&reg;': '\u00ae',
        '&macr;': '\u00af',
        '&deg;': '\u00b0',
        '&plusmn;': '\u00b1',
        '&sup2;': '\u00b2',
        '&sup3;': '\u00b3',
        '&acute;': '\u017d',
        '&micro;': '\u00b5',
        '&para;': '\u00b6',
        '&middot;': '\u00b7',
        '&cedil;': '\u017e',
        '&sup1;': '\u00b9',
        '&ordm;': '\u00ba',
        '&raquo;': '\u00bb',
        '&frac14;': '\u0152',
        '&frac12;': '\u0153',
        '&frac34;': '\u0178',
        '&iquest;': '\u00bf',
        '&Agrave;': '\u00c0',
        '&Aacute;': '\u00c1',
        '&Acirc;': '\u00c2',
        '&Atilde;': '\u00c3',
        '&Auml;': '\u00c4',
        '&Aring;': '\u00c5',
        '&AElig;': '\u00c6',
        '&Ccedil;': '\u00c7',
        '&Egrave;': '\u00c8',
        '&Eacute;': '\u00c9',
        '&Ecirc;': '\u00ca',
        '&Euml;': '\u00cb',
        '&Igrave;': '\u00cc',
        '&Iacute;': '\u00cd',
        '&Icirc;': '\u00ce',
        '&Iuml;': '\u00cf',
        '&ETH;': '\u00d0',
        '&Ntilde;': '\u00d1',
        '&Ograve;': '\u00d2',
        '&Oacute;': '\u00d3',
        '&Ocirc;': '\u00d4',
        '&Otilde;': '\u00d5',
        '&Ouml;': '\u00d6',
        '&times;': '\u00d7',
        '&Oslash;': '\u00d8',
        '&Ugrave;': '\u00d9',
        '&Uacute;': '\u00da',
        '&Ucirc;': '\u00db',
        '&Uuml;': '\u00dc',
        '&Yacute;': '\u00dd',
        '&THORN;': '\u00de',
        '&szlig;': '\u00df',
        '&agrave;': '\u00e0',
        '&aacute;': '\u00e1',
        '&acirc;': '\u00e2',
        '&atilde;': '\u00e3',
        '&auml;': '\u00e4',
        '&aring;': '\u00e5',
        '&aelig;': '\u00e6',
        '&ccedil;': '\u00e7',
        '&egrave;': '\u00e8',
        '&eacute;': '\u00e9',
        '&ecirc;': '\u00ea',
        '&euml;': '\u00eb',
        '&igrave;': '\u00ec',
        '&iacute;': '\u00ed',
        '&icirc;': '\u00ee',
        '&iuml;': '\u00ef',
        '&eth;': '\u00f0',
        '&ntilde;': '\u00f1',
        '&ograve;': '\u00f2',
        '&oacute;': '\u00f3',
        '&ocirc;': '\u00f4',
        '&otilde;': '\u00f5',
        '&ouml;': '\u00f6',
        '&divide;': '\u00f7',
        '&oslash;': '\u00f8',
        '&ugrave;': '\u00f9',
        '&uacute;': '\u00fa',
        '&ucirc;': '\u00fb',
        '&uuml;': '\u00fc',
        '&yacute;': '\u00fd',
        '&thorn;': '\u00fe',
        '&yuml;': '\u00ff',
        '&quot;': '\u0022',
        '&lt;': '\u003c',
        '&gt;': '\u003e',
        '&apos;': '\u0027',
        '&minus;': '\u2212',
        '&circ;': '\u02c6',
        '&tilde;': '\u02dc',
        '&Scaron;': '\u0160',
        '&lsaquo;': '\u2039',
        '&OElig;': '\u0152',
        '&lsquo;': '\u2018',
        '&rsquo;': '\u2019',
        '&ldquo;': '\u201c',
        '&rdquo;': '\u201d',
        '&bull;': '\u2022',
        '&ndash;': '\u2013',
        '&mdash;': '\u2014',
        '&trade;': '\u2122',
        '&scaron;': '\u0161',
        '&rsaquo;': '\u203a',
        '&oelig;': '\u0153',
        '&Yuml;': '\u0178',
        '&fnof;': '\u0192',
        '&Alpha;': '\u0391',
        '&Beta;': '\u0392',
        '&Gamma;': '\u0393',
        '&Delta;': '\u0394',
        '&Epsilon;': '\u0395',
        '&Zeta;': '\u0396',
        '&Eta;': '\u0397',
        '&Theta;': '\u0398',
        '&Iota;': '\u0399',
        '&Kappa;': '\u039a',
        '&Lambda;': '\u039b',
        '&Mu;': '\u039c',
        '&Nu;': '\u039d',
        '&Xi;': '\u039e',
        '&Omicron;': '\u039f',
        '&Pi;': '\u03a0',
        '&Rho;': '\u03a1',
        '&Sigma;': '\u03a3',
        '&Tau;': '\u03a4',
        '&Upsilon;': '\u03a5',
        '&Phi;': '\u03a6',
        '&Chi;': '\u03a7',
        '&Psi;': '\u03a8',
        '&Omega;': '\u03a9',
        '&alpha;': '\u03b1',
        '&beta;': '\u03b2',
        '&gamma;': '\u03b3',
        '&delta;': '\u03b4',
        '&epsilon;': '\u03b5',
        '&zeta;': '\u03b6',
        '&eta;': '\u03b7',
        '&theta;': '\u03b8',
        '&iota;': '\u03b9',
        '&kappa;': '\u03ba',
        '&lambda;': '\u03bb',
        '&mu;': '\u03bc',
        '&nu;': '\u03bd',
        '&xi;': '\u03be',
        '&omicron;': '\u03bf',
        '&pi;': '\u03c0',
        '&rho;': '\u03c1',
        '&sigmaf;': '\u03c2',
        '&sigma;': '\u03c3',
        '&tau;': '\u03c4',
        '&upsilon;': '\u03c5',
        '&phi;': '\u03c6',
        '&chi;': '\u03c7',
        '&psi;': '\u03c8',
        '&omega;': '\u03c9',
        '&thetasym;': '\u03d1',
        '&upsih;': '\u03d2',
        '&piv;': '\u03d6',
        '&ensp;': '\u2002',
        '&emsp;': '\u2003',
        '&thinsp;': '\u2009',
        '&zwnj;': '\u200c',
        '&zwj;': '\u200d',
        '&lrm;': '\u200e',
        '&rlm;': '\u200f',
        '&sbquo;': '\u201a',
        '&bdquo;': '\u201e',
        '&dagger;': '\u2020',
        '&Dagger;': '\u2021',
        '&hellip;': '\u2026',
        '&permil;': '\u2030',
        '&prime;': '\u2032',
        '&Prime;': '\u2033',
        '&oline;': '\u203e',
        '&frasl;': '\u2044',
        '&euro;': '\u20ac',
        '&image;': '\u2111',
        '&weierp;': '\u2118',
        '&real;': '\u211c',
        '&alefsym;': '\u2135',
        '&larr;': '\u2190',
        '&uarr;': '\u2191',
        '&rarr;': '\u2192',
        '&darr;': '\u2193',
        '&harr;': '\u2194',
        '&crarr;': '\u21b5',
        '&lArr;': '\u21d0',
        '&uArr;': '\u21d1',
        '&rArr;': '\u21d2',
        '&dArr;': '\u21d3',
        '&hArr;': '\u21d4',
        '&forall;': '\u2200',
        '&part;': '\u2202',
        '&exist;': '\u2203',
        '&empty;': '\u2205',
        '&nabla;': '\u2207',
        '&isin;': '\u2208',
        '&notin;': '\u2209',
        '&ni;': '\u220b',
        '&prod;': '\u220f',
        '&sum;': '\u2211',
        '&lowast;': '\u2217',
        '&radic;': '\u221a',
        '&prop;': '\u221d',
        '&infin;': '\u221e',
        '&ang;': '\u2220',
        '&and;': '\u2227',
        '&or;': '\u2228',
        '&cap;': '\u2229',
        '&cup;': '\u222a',
        '&int;': '\u222b',
        '&there4;': '\u2234',
        '&sim;': '\u223c',
        '&cong;': '\u2245',
        '&asymp;': '\u2248',
        '&ne;': '\u2260',
        '&equiv;': '\u2261',
        '&le;': '\u2264',
        '&ge;': '\u2265',
        '&sub;': '\u2282',
        '&sup;': '\u2283',
        '&nsub;': '\u2284',
        '&sube;': '\u2286',
        '&supe;': '\u2287',
        '&oplus;': '\u2295',
        '&otimes;': '\u2297',
        '&perp;': '\u22a5',
        '&sdot;': '\u22c5',
        '&lceil;': '\u2308',
        '&rceil;': '\u2309',
        '&lfloor;': '\u230a',
        '&rfloor;': '\u230b',
        '&lang;': '\u2329',
        '&rang;': '\u232a',
        '&loz;': '\u25ca',
        '&spades;': '\u2660',
        '&clubs;': '\u2663',
        '&hearts;': '\u2665',
        '&diams;': '\u2666'
    };

    var decode = function (str) {
        if (!~str.indexOf('&')) return str;

        //Decode literal entities
        for (var i in entities) {
            str = str.replace(new RegExp(i, 'g'), entities[i]);
        }

        //Decode hex entities
        str = str.replace(/&#x(0*[0-9a-f]{2,5});?/gi, function (m, code) {
            return String.fromCharCode(parseInt(+code, 16));
        });

        //Decode numeric entities
        str = str.replace(/&#([0-9]{2,4});?/gi, function (m, code) {
            return String.fromCharCode(+code);
        });

        str = str.replace(/&amp;/g, '&');

        return str;
    }

    var encode = function (str) {
        str = str.replace(/&/g, '&amp;');

        //IE doesn't accept &apos;
        str = str.replace(/'/g, '&#39;');

        //Encode literal entities
        for (var i in entities) {
            str = str.replace(new RegExp(entities[i], 'g'), i);
        }

        return str;
    }

    exports.entities = {
        encode: encode,
        decode: decode
    }

    //This module is adapted from the CodeIgniter framework
    //The license is available at http://codeigniter.com/

    var never_allowed_str = {
        'document.cookie':              '',
        'document.write':               '',
        '.parentNode':                  '',
        '.innerHTML':                   '',
        'window.location':              '',
        '-moz-binding':                 '',
        '<!--':                         '&lt;!--',
        '-->':                          '--&gt;',
        '<![CDATA[':                    '&lt;![CDATA['
    };

    var never_allowed_regex = {
        'javascript\\s*:':              '',
        'expression\\s*(\\(|&\\#40;)':  '',
        'vbscript\\s*:':                '',
        'Redirect\\s+302':              ''
    };

    var non_displayables = [
        /%0[0-8bcef]/g,           // url encoded 00-08, 11, 12, 14, 15
        /%1[0-9a-f]/g,            // url encoded 16-31
        /[\x00-\x08]/g,           // 00-08
        /\x0b/g, /\x0c/g,         // 11,12
        /[\x0e-\x1f]/g            // 14-31
    ];

    var compact_words = [
        'javascript', 'expression', 'vbscript',
        'script', 'applet', 'alert', 'document',
        'write', 'cookie', 'window'
    ];

    exports.xssClean = function(str, is_image) {

        //Recursively clean objects and arrays
        if (typeof str === 'object') {
            for (var i in str) {
                str[i] = exports.xssClean(str[i]);
            }
            return str;
        }

        //Remove invisible characters
        str = remove_invisible_characters(str);

        //Protect query string variables in URLs => 901119URL5918AMP18930PROTECT8198
        str = str.replace(/\&([a-z\_0-9]+)\=([a-z\_0-9]+)/i, xss_hash() + '$1=$2');

        //Validate standard character entities - add a semicolon if missing.  We do this to enable
        //the conversion of entities to ASCII later.
        str = str.replace(/(&\#?[0-9a-z]{2,})([\x00-\x20])*;?/i, '$1;$2');

        //Validate UTF16 two byte encoding (x00) - just as above, adds a semicolon if missing.
        str = str.replace(/(&\#x?)([0-9A-F]+);?/i, '$1;$2');

        //Un-protect query string variables
        str = str.replace(xss_hash(), '&');

        //Decode just in case stuff like this is submitted:
        //<a href="http://%77%77%77%2E%67%6F%6F%67%6C%65%2E%63%6F%6D">Google</a>
        try {
          str = decodeURIComponent(str);
        } catch (e) {
          // str was not actually URI-encoded
        }

        //Convert character entities to ASCII - this permits our tests below to work reliably.
        //We only convert entities that are within tags since these are the ones that will pose security problems.
        str = str.replace(/[a-z]+=([\'\"]).*?\1/gi, function(m, match) {
            return m.replace(match, convert_attribute(match));
        });

        //Remove invisible characters again
        str = remove_invisible_characters(str);

        //Convert tabs to spaces
        str = str.replace('\t', ' ');

        //Captured the converted string for later comparison
        var converted_string = str;

        //Remove strings that are never allowed
        for (var i in never_allowed_str) {
            str = str.replace(i, never_allowed_str[i]);
        }

        //Remove regex patterns that are never allowed
        for (var i in never_allowed_regex) {
            str = str.replace(new RegExp(i, 'i'), never_allowed_regex[i]);
        }

        //Compact any exploded words like:  j a v a s c r i p t
        // We only want to do this when it is followed by a non-word character
        for (var i in compact_words) {
            var spacified = compact_words[i].split('').join('\\s*')+'\\s*';

            str = str.replace(new RegExp('('+spacified+')(\\W)', 'ig'), function(m, compat, after) {
                return compat.replace(/\s+/g, '') + after;
            });
        }

        //Remove disallowed Javascript in links or img tags
        do {
            var original = str;

            if (str.match(/<a/i)) {
                str = str.replace(/<a\s+([^>]*?)(>|$)/gi, function(m, attributes, end_tag) {
                    attributes = filter_attributes(attributes.replace('<','').replace('>',''));
                    return m.replace(attributes, attributes.replace(/href=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\s*,)/gi, ''));
                });
            }

            if (str.match(/<img/i)) {
                str = str.replace(/<img\s+([^>]*?)(\s?\/?>|$)/gi, function(m, attributes, end_tag) {
                    attributes = filter_attributes(attributes.replace('<','').replace('>',''));
                    return m.replace(attributes, attributes.replace(/src=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\s*,)/gi, ''));
                });
            }

            if (str.match(/script/i) || str.match(/xss/i)) {
                str = str.replace(/<(\/*)(script|xss)(.*?)\>/gi, '');
            }

        } while(original != str);

        //Remove JavaScript Event Handlers - Note: This code is a little blunt.  It removes the event
        //handler and anything up to the closing >, but it's unlikely to be a problem.
        event_handlers = ['[^a-z_\-]on\\w*'];

        //Adobe Photoshop puts XML metadata into JFIF images, including namespacing,
        //so we have to allow this for images
        if (!is_image) {
            event_handlers.push('xmlns');
        }

        str = str.replace(new RegExp("<([^><]+?)("+event_handlers.join('|')+")(\\s*=\\s*[^><]*)([><]*)", 'i'), '<$1$4');

        //Sanitize naughty HTML elements
        //If a tag containing any of the words in the list
        //below is found, the tag gets converted to entities.
        //So this: <blink>
        //Becomes: &lt;blink&gt;
        naughty = 'alert|applet|audio|basefont|base|behavior|bgsound|blink|body|embed|expression|form|frameset|frame|head|html|ilayer|iframe|input|isindex|layer|link|meta|object|plaintext|style|script|textarea|title|video|xml|xss';
        str = str.replace(new RegExp('<(/*\\s*)('+naughty+')([^><]*)([><]*)', 'gi'), function(m, a, b, c, d) {
            return '&lt;' + a + b + c + d.replace('>','&gt;').replace('<','&lt;');
        });

        //Sanitize naughty scripting elements Similar to above, only instead of looking for
        //tags it looks for PHP and JavaScript commands that are disallowed.  Rather than removing the
        //code, it simply converts the parenthesis to entities rendering the code un-executable.
        //For example:    eval('some code')
        //Becomes:        eval&#40;'some code'&#41;
        str = str.replace(/(alert|cmd|passthru|eval|exec|expression|system|fopen|fsockopen|file|file_get_contents|readfile|unlink)(\s*)\((.*?)\)/gi, '$1$2&#40;$3&#41;');

        //This adds a bit of extra precaution in case something got through the above filters
        for (var i in never_allowed_str) {
            str = str.replace(i, never_allowed_str[i]);
        }
        for (var i in never_allowed_regex) {
            str = str.replace(new RegExp(i, 'i'), never_allowed_regex[i]);
        }

        //Images are handled in a special way
        if (is_image && str !== converted_string) {
            throw new Error('Image may contain XSS');
        }

        return str;
    }

    function remove_invisible_characters(str) {
        for (var i in non_displayables) {
            str = str.replace(non_displayables[i], '');
        }
        return str;
    }

    function xss_hash() {
        //TODO: Create a random hash
        return '!*$^#(@*#&';
    }

    function convert_attribute(str) {
        return str.replace('>','&gt;').replace('<','&lt;').replace('\\','\\\\');
    }

    //Filter Attributes - filters tag attributes for consistency and safety
    function filter_attributes(str) {
        var comments = /\/\*.*?\*\//g;
        return str.replace(/\s*[a-z-]+\s*=\s*'[^']*'/gi, function (m) {
            return m.replace(comments, '');
        }).replace(/\s*[a-z-]+\s*=\s*"[^"]*"/gi, function (m) {
            return m.replace(comments, '');
        }).replace(/\s*[a-z-]+\s*=\s*[^\s]+/gi, function (m) {
            return m.replace(comments, '');
        });
    }

    var Validator = exports.Validator = function() {}

    Validator.prototype.check = function(str, fail_msg) {
        this.str = typeof( str ) === 'undefined' || str === null || (isNaN(str) && str.length === undefined) ? '' : str+'';
        this.msg = fail_msg;
        this._errors = this._errors || [];
        return this;
    }

    function internal_is_ipv4(str) {
        if (/^(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)$/.test(str)) {
            var parts = str.split('.').sort();
            // no need to check for < 0 as regex won't match in that case
            if (parts[3] > 255) {
                return false;
            }
            return true;
        }
        return false;
    }

    function internal_is_ipv6(str) {
        if (/^::|^::1|^([a-fA-F0-9]{1,4}::?){1,7}([a-fA-F0-9]{1,4})$/.test(str)) {
            return true;
        }
        return false;
    }

    //Create some aliases - may help code readability
    Validator.prototype.validate = Validator.prototype.check;
    Validator.prototype.assert = Validator.prototype.check;

    Validator.prototype.error = function(msg) {
        throw new Error(msg);
    }

    function toDate(date) {
        if (date instanceof Date) {
            return date;
        }
        var intDate = Date.parse(date);
        if (isNaN(intDate)) {
            return null;
        }
        return new Date(intDate);
    }

    Validator.prototype.isAfter = function(date) {
        date = date || new Date();
        var origDate = toDate(this.str)
          , compDate = toDate(date);
        if (!(origDate && compDate && origDate >= compDate)) {
            return this.error(this.msg || 'Invalid date');
        }
        return this;
    };

    Validator.prototype.isBefore = function(date) {
        date = date || new Date();
        var origDate = toDate(this.str)
          , compDate = toDate(date);
        if (!(origDate && compDate && origDate <= compDate)) {
            return this.error(this.msg || 'Invalid date');
        }
        return this;
    };

    Validator.prototype.isEmail = function() {
        if (!this.str.match(/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/)) {
            return this.error(this.msg || 'Invalid email');
        }
        return this;
    }

  //Will work against Visa, MasterCard, American Express, Discover, Diners Club, and JCB card numbering formats
  Validator.prototype.isCreditCard = function() {
    this.str = this.str.replace(/[^0-9]+/g, ''); //remove all dashes, spaces, etc.
        if (!this.str.match(/^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/)) {
            return this.error(this.msg || 'Invalid credit card');
        }
        // Doing Luhn check
        var sum = 0;
        var digit;
        var tmpNum;
        var shouldDouble = false;
        for (var i = this.length - 1; i >= 0; i--) {
                digit = this.substring(i, (i + 1));
                tmpNum = parseInt(digit, 10);
                if (shouldDouble) {
                    tmpNum *= 2;
                    if (tmpNum >= 10) {
                        sum += ((tmpNum % 10) + 1);
                    }
                    else {
                        sum += tmpNum;
                    }
                }
                else {
                    sum += tmpNum;
                }
                if (shouldDouble) {
                    shouldDouble = false;
                }
                else {
                    shouldDouble = true;
                }
            }
            if ((sum % 10) !== 0) {
                return this.error(this.msg || 'Invalid credit card');
            }
        return this;
    }

    Validator.prototype.isUrl = function() {
        if (!this.str.match(/^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i) || this.str.length > 2083) {
            return this.error(this.msg || 'Invalid URL');
        }
        return this;
    }

    Validator.prototype.isIPv4 = function() {
        if (internal_is_ipv4(this.str)) {
            return this;
        }
        return this.error(this.msg || 'Invalid IP');
    }

    Validator.prototype.isIPv6 = function() {
        if (internal_is_ipv6(this.str)) {
            return this;
        }
        return this.error(this.msg || 'Invalid IP');
    }

    Validator.prototype.isIP = function() {
        if (internal_is_ipv4(this.str) || internal_is_ipv6(this.str)) {
            return this;
        }
        return this.error(this.msg || 'Invalid IP');
    }

    Validator.prototype.isAlpha = function() {
        if (!this.str.match(/^[a-zA-Z]+$/)) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.isAlphanumeric = function() {
        if (!this.str.match(/^[a-zA-Z0-9]+$/)) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.isNumeric = function() {
        if (!this.str.match(/^-?[0-9]+$/)) {
            return this.error(this.msg || 'Invalid number');
        }
        return this;
    }

    Validator.prototype.isHexadecimal = function() {
        if (!this.str.match(/^[0-9a-fA-F]+$/)) {
            return this.error(this.msg || 'Invalid hexadecimal');
        }
        return this;
    }

    Validator.prototype.isHexColor = function() {
        if (!this.str.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
            return this.error(this.msg || 'Invalid hexcolor');
        }
        return this;
    }

    Validator.prototype.isLowercase = function() {
        if (this.str !== this.str.toLowerCase()) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.isUppercase = function() {
        if (this.str !== this.str.toUpperCase()) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.isInt = function() {
        if (!this.str.match(/^(?:-?(?:0|[1-9][0-9]*))$/)) {
            return this.error(this.msg || 'Invalid integer');
        }
        return this;
    }

    Validator.prototype.isDecimal = function() {
        if (!this.str.match(/^(?:-?(?:0|[1-9][0-9]*))?(?:\.[0-9]*)?$/)) {
            return this.error(this.msg || 'Invalid decimal');
        }
        return this;
    }

    Validator.prototype.isDivisibleBy = function(n) {
        return (parseFloat(this.str) % parseInt(n, 10)) === 0;
    }

    Validator.prototype.isFloat = function() {
        return this.isDecimal();
    }

    Validator.prototype.notNull = function() {
        if (this.str === '') {
            return this.error(this.msg || 'String is empty');
        }
        return this;
    }

    Validator.prototype.isNull = function() {
        if (this.str !== '') {
            return this.error(this.msg || 'String is not empty');
        }
        return this;
    }

    Validator.prototype.notEmpty = function() {
        if (this.str.match(/^[\s\t\r\n]*$/)) {
            return this.error(this.msg || 'String is whitespace');
        }
        return this;
    }

    Validator.prototype.equals = function(equals) {
        if (this.str != equals) {
            return this.error(this.msg || 'Not equal');
        }
        return this;
    }

    Validator.prototype.contains = function(str) {
        if (this.str.indexOf(str) === -1 || !str) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.notContains = function(str) {
        if (this.str.indexOf(str) >= 0) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.regex = Validator.prototype.is = function(pattern, modifiers) {
        if (Object.prototype.toString.call(pattern).slice(8, -1) !== 'RegExp') {
            pattern = new RegExp(pattern, modifiers);
        }
        if (! this.str.match(pattern)) {
            return this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.notRegex = Validator.prototype.not = function(pattern, modifiers) {
        if (Object.prototype.toString.call(pattern).slice(8, -1) !== 'RegExp') {
            pattern = new RegExp(pattern, modifiers);
        }
        if (this.str.match(pattern)) {
            this.error(this.msg || 'Invalid characters');
        }
        return this;
    }

    Validator.prototype.len = function(min, max) {
        if (this.str.length < min) {
            return this.error(this.msg || 'String is too small');
        }
        if (typeof max !== undefined && this.str.length > max) {
            return this.error(this.msg || 'String is too large');
        }
        return this;
    }

    //Thanks to github.com/sreuter for the idea.
    Validator.prototype.isUUID = function(version) {
        var pattern;
        if (version == 3 || version == 'v3') {
            pattern = /[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
        } else if (version == 4 || version == 'v4') {
            pattern = /[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
        } else if (version == 5 || version == 'v5') {
            pattern = /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
        } else {
            pattern = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
        }
        if (!this.str.match(pattern)) {
            return this.error(this.msg || 'Not a UUID');
        }
        return this;
    }

    Validator.prototype.isUUIDv3 = function() {
        return this.isUUID(3);
    }

    Validator.prototype.isUUIDv4 = function() {
        return this.isUUID(4);
    }

    Validator.prototype.isUUIDv5 = function() {
        return this.isUUID(5);
    }

    Validator.prototype.isDate = function() {
        var intDate = Date.parse(this.str);
        if (isNaN(intDate)) {
            return this.error(this.msg || 'Not a date');
        }
        return this;
    }

    Validator.prototype.isIn = function(options) {
        if (options && typeof options.indexOf === 'function') {
            if (!~options.indexOf(this.str)) {
                return this.error(this.msg || 'Unexpected value');
            }
            return this;
        } else {
            return this.error(this.msg || 'Invalid in() argument');
        }
    }

    Validator.prototype.notIn = function(options) {
        if (options && typeof options.indexOf === 'function') {
            if (options.indexOf(this.str) !== -1) {
                return this.error(this.msg || 'Unexpected value');
            }
            return this;
        } else {
            return this.error(this.msg || 'Invalid notIn() argument');
        }
    }

    Validator.prototype.min = function(val) {
        var number = parseFloat(this.str);

        if (!isNaN(number) && number < val) {
            return this.error(this.msg || 'Invalid number');
        }

        return this;
    }

    Validator.prototype.max = function(val) {
        var number = parseFloat(this.str);
        if (!isNaN(number) && number > val) {
            return this.error(this.msg || 'Invalid number');
        }
        return this;
    }

    var Filter = exports.Filter = function() {}

    var whitespace = '\\r\\n\\t\\s';

    Filter.prototype.modify = function(str) {
        this.str = str;
    }

    //Create some aliases - may help code readability
    Filter.prototype.convert = Filter.prototype.sanitize = function(str) {
        this.str = str == null ? '' : str + '';
        return this;
    }

    Filter.prototype.xss = function(is_image) {
        this.modify(exports.xssClean(this.str, is_image));
        return this.str;
    }

    Filter.prototype.entityDecode = function() {
        this.modify(decode(this.str));
        return this.str;
    }

    Filter.prototype.entityEncode = function() {
        this.modify(encode(this.str));
        return this.str;
    }

    Filter.prototype.escape = function() {
        this.modify(this.str.replace(/&/g, '&amp;')
                            .replace(/"/g, '&quot;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;'));
        return this.str;
    };

    Filter.prototype.ltrim = function(chars) {
        chars = chars || whitespace;
        this.modify(this.str.replace(new RegExp('^['+chars+']+', 'g'), ''));
        return this.str;
    }

    Filter.prototype.rtrim = function(chars) {
        chars = chars || whitespace;
        this.modify(this.str.replace(new RegExp('['+chars+']+$', 'g'), ''));
        return this.str;
    }

    Filter.prototype.trim = function(chars) {
        chars = chars || whitespace;
        this.modify(this.str.replace(new RegExp('^['+chars+']+|['+chars+']+$', 'g'), ''));
        return this.str;
    }

    Filter.prototype.ifNull = function(replace) {
        if (!this.str || this.str === '') {
            this.modify(replace);
        }
        return this.str;
    }

    Filter.prototype.toFloat = function() {
        this.modify(parseFloat(this.str));
        return this.str;
    }

    Filter.prototype.toInt = function(radix) {
        radix = radix || 10;
        this.modify(parseInt(this.str, radix));
        return this.str;
    }

    //Any strings with length > 0 (except for '0' and 'false') are considered true,
    //all other strings are false
    Filter.prototype.toBoolean = function() {
        if (!this.str || this.str == '0' || this.str == 'false' || this.str == '') {
            this.modify(false);
        } else {
            this.modify(true);
        }
        return this.str;
    }

    //String must be equal to '1' or 'true' to be considered true, all other strings
    //are false
    Filter.prototype.toBooleanStrict = function() {
        if (this.str == '1' || this.str == 'true') {
            this.modify(true);
        } else {
            this.modify(false);
        }
        return this.str;
    }

    //Quick access methods
    exports.sanitize = exports.convert = function(str) {
        var filter = new exports.Filter();
        return filter.sanitize(str);
    }

    exports.check = exports.validate = exports.assert = function(str, fail_msg) {
        var validator = new exports.Validator();
        return validator.check(str, fail_msg);
    }

    return exports;

}));
