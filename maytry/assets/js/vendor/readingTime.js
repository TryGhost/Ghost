/*!

Name: Reading Time
Dependencies: jQuery
Author: Michael Lynch
Author URL: http://michaelynch.com
Date Created: August 14, 2013
Date Updated: June 10, 2014
Licensed under the MIT license

*/

(function($) {

	$.fn.readingTime = function(options) {

		//return if no element was bound
		//so chained events can continue
		if(!this.length) {
			return this;
		}

		// define lang
		var lang = options.lang || "en";

		//define default parameters
		var defaults = {
			readingTimeTarget: ".eta",
			wordCountTarget: null,
			wordsPerMinute: (lang == "ja" ? 450 : 270),
			round: true,
			lang: "en",
			lessThanAMinuteString: "",
			prependTimeString: "",
			prependWordString: "",
			remotePath: null,
			remoteTarget: null
		};

		//define plugin
		var plugin = this;

		//define element
		var el = $(this);

		//merge defaults and options
		plugin.settings = $.extend({}, defaults, options);

		//define vars
		var readingTimeTarget = plugin.settings.readingTimeTarget;
		var wordCountTarget = plugin.settings.wordCountTarget;
		var wordsPerMinute = plugin.settings.wordsPerMinute;
		var round = plugin.settings.round;
		var lessThanAMinuteString = plugin.settings.lessThanAMinuteString;
		var prependTimeString = plugin.settings.prependTimeString;
		var prependWordString = plugin.settings.prependWordString;
		var remotePath = plugin.settings.remotePath;
		var remoteTarget = plugin.settings.remoteTarget;

		var lessThanAMinute = "";
		var minShortForm = (lang == "ja" ? "分" : "min");

		//if lang is set to italian
		if(lang == "it") {
			lessThanAMinute = lessThanAMinuteString || "Meno di un minuto";
		//if lang is set to french
		} else if(lang == "fr") {
			lessThanAMinute = lessThanAMinuteString || "Moins d'une minute";
		//if lang is set to german
		} else if(lang == "de") {
			lessThanAMinute = lessThanAMinuteString || "Weniger als eine Minute";
		//if lang is set to spanish
		} else if(lang == "es") {
			lessThanAMinute = lessThanAMinuteString || "Menos de un minuto";
		//if lang is set to dutch
		} else if(lang == "nl") {
			lessThanAMinute = lessThanAMinuteString || "Minder dan een minuut";
		//if lang is set to slovak
		} else if(lang == "sk") {
			lessThanAMinute = lessThanAMinuteString || "Menej než minútu";
		//if lang is set to czech
		} else if(lang == "cz") {
			lessThanAMinute = lessThanAMinuteString || "Méně než minutu";
			//default lang is japanese
		} else if(lang == "ja") {
			lessThanAMinute = lessThanAMinuteString || "1分未満";
			//default lang is english
		} else {
			lessThanAMinute = lessThanAMinuteString || "Less than a minute";
		}

		var setTime = function(text) {
			//split text by spaces to define total words
			var totalWords = (lang == "ja" ? text.trim().length : text.trim().split(/\s+/g).length);
			//define words per second based on words per minute (wordsPerMinute)
			var wordsPerSecond = wordsPerMinute / 60;
			//define total reading time in seconds
			var totalReadingTimeSeconds = totalWords / wordsPerSecond;
			//define reading time in minutes
			//if round is set to true
			var readingTimeMinutes = 0;
			if(round === true) {
				readingTimeMinutes = Math.round(totalReadingTimeSeconds / 60);
			//if round is set to false
			} else {
				readingTimeMinutes = Math.floor(totalReadingTimeSeconds / 60);
			}

			//define remaining reading time seconds
			var readingTimeSeconds = Math.round(totalReadingTimeSeconds - readingTimeMinutes * 60);

			//if round is set to true
			if(round === true) {
				//if minutes are greater than 0
				if(readingTimeMinutes > 0) {
					//set reading time by the minute
					$(readingTimeTarget).text(prependTimeString + readingTimeMinutes + minShortForm);
				} else {
					//set reading time as less than a minute
					$(readingTimeTarget).text(prependTimeString + lessThanAMinute);
				}

			//if round is set to false
			} else {
				//format reading time
				var readingTime = readingTimeMinutes + ":" + readingTimeSeconds;
				//set reading time in minutes and seconds
				$(readingTimeTarget).text(prependTimeString + readingTime);
			}

			//if word count container isn"t blank or undefined
			if(wordCountTarget !== "" && wordCountTarget !== undefined) {
				//set word count
				$(wordCountTarget).text(prependWordString + totalWords);
			}
		};

		//for each element
		el.each(function() {
			//if remotePath and remoteTarget aren"t null
			if(remotePath != null && remoteTarget != null) {
				//get contents of remote file
				$.get(remotePath, function(data) {
					//set time using the remote target found in the remote file
					setTime($("<div>").html(data).find(remoteTarget).text());
				});
			} else {
				//set time using the targeted element
				setTime(el.text());
			}
		});
	}
})(jQuery);
