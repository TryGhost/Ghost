/**
 * filesize
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2014 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/filesize.js/master/LICENSE>
 * @link http://filesizejs.com
 * @module filesize
 * @version 2.0.4
 */
( function ( global ) {
"use strict";

var bit   = /b$/,
    radix = 10,
    left  = /.*\./,
    zero  = /^0$/;

/**
 * filesize
 *
 * @method filesize
 * @param  {Mixed}   arg        String, Int or Float to transform
 * @param  {Object}  descriptor [Optional] Flags
 * @return {String}             Readable file size String
 */
function filesize ( arg, descriptor ) {
	var result = "",
	    skip   = false,
	    val    = 0,
	    e, base, bits, ceil, neg, num, round, unix, spacer, suffix, z, suffixes;

	if ( isNaN( arg ) ) {
		throw new Error( "Invalid arguments" );
	}

	descriptor = descriptor || {};
	bits       = ( descriptor.bits === true );
	unix       = ( descriptor.unix === true );
	base       = descriptor.base     !== undefined ? descriptor.base     : unix ? 2  : 10;
	round      = descriptor.round    !== undefined ? descriptor.round    : unix ? 1  : 2;
	spacer     = descriptor.spacer   !== undefined ? descriptor.spacer   : unix ? "" : " ";
	suffixes   = descriptor.suffixes !== undefined ? descriptor.suffixes : {};
	num        = Number( arg );
	neg        = ( num < 0 );
	ceil       = base > 2 ? 1000 : 1024;

	// Flipping a negative number to determine the size
	if ( neg ) {
		num = -num;
	}

	// Zero is now a special case because bytes divide by 1
	if ( num === 0 ) {
		if ( unix ) {
			result = "0";
		}
		else {
			suffix = "B";
			result = "0" + spacer + ( suffixes[suffix] || suffix );
		}
	}
	else {
		e = Math.floor( Math.log( num ) / Math.log( 1000 ) );

		// Exceeding supported length, time to reduce & multiply
		if ( e > 8 ) {
			val = val * ( 1000 * ( e - 8 ) );
			e   = 8;
		}

		if ( base === 2 ) {
			val = num / Math.pow( 2, ( e * 10 ) );
		}
		else {
			val = num / Math.pow( 1000, e );
		}

		if ( bits ) {
			val = ( val * 8 );

			if ( val > ceil ) {
				val = val / ceil;
				e++;
			}
		}

		result = val.toFixed( e > 0 ? round : 0 );
		suffix = si[bits ? "bits" : "bytes"][e];

		if ( !skip && unix ) {
			if ( bits && bit.test( suffix ) ) {
				suffix = suffix.toLowerCase();
			}

			suffix = suffix.charAt( 0 );
			z      = result.replace( left, "" );

			if ( suffix === "B" ) {
				suffix = "";
			}
			else if ( !bits && suffix === "k" ) {
				suffix = "K";
			}

			if ( zero.test( z ) ) {
				result = parseInt( result, radix ).toString();
			}

			result += spacer + ( suffixes[suffix] || suffix );
		}
		else if ( !unix ) {
			result += spacer + ( suffixes[suffix] || suffix );
		}
	}

	// Decorating a 'diff'
	if ( neg ) {
		result = "-" + result;
	}

	return result;
}

/**
 * SI suffixes
 *
 * @type {Object}
 */
var si = {
	bits  : ["B", "kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"],
	bytes : ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
};

// CommonJS, AMD, script tag
if ( typeof exports !== "undefined" ) {
	module.exports = filesize;
}
else if ( typeof define === "function" ) {
	define( function () {
		return filesize;
	} );
}
else {
	global.filesize = filesize;
}

} )( this );
