// Initialize data globally to reduce memory consumption
var num_loaded = 0;
var aff_loading = false;
var dic_loading = false;
var aff_data = "";
var dic_data = "";
var typo;


CodeMirror.defineMode("spell-checker", function(config, parserConfig) {
	// Load AFF/DIC data
	if(!aff_loading){
		aff_loading = true;
		var xhr_aff = new XMLHttpRequest();
		xhr_aff.open("GET", "https://cdn.jsdelivr.net/codemirror.spell-checker/latest/en_US.aff", true);
		xhr_aff.onload = function (e) {
			if (xhr_aff.readyState === 4 && xhr_aff.status === 200) {
				aff_data = xhr_aff.responseText;
				num_loaded++;
				
				if(num_loaded == 2){
					typo = new Typo("en_US", aff_data, dic_data, {
						platform: 'any'
					});
				}
			}
		};
		xhr_aff.send(null);
	}
	
	if(!dic_loading){
		dic_loading = true;
		var xhr_dic = new XMLHttpRequest();
		xhr_dic.open("GET", "https://cdn.jsdelivr.net/codemirror.spell-checker/latest/en_US.dic", true);
		xhr_dic.onload = function (e) {
			if (xhr_dic.readyState === 4 && xhr_dic.status === 200) {
				dic_data = xhr_dic.responseText;
				num_loaded++;
				
				if(num_loaded == 2){
					typo = new Typo("en_US", aff_data, dic_data, {
						platform: 'any'
					});
				}
			}
		};
		xhr_dic.send(null);
	}

	
	
	// Define what separates a word
	var rx_word = "!\"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ ";
	
	
	// Create the overlay and such
	var overlay = {
		token: function(stream, state) {
			var ch = stream.peek();
			var word = "";

			if(rx_word.includes(ch)) {
				stream.next();
				return null;
			}

			while((ch = stream.peek()) != null && !rx_word.includes(ch)) {
				word += ch;
				stream.next();
			}

			if(typo && !typo.check(word))
				return "spell-error"; // CSS class: cm-spell-error

			return null;
		}
	};

	var mode = CodeMirror.getMode(
		config, config.backdrop || "text/plain"
	);

	return CodeMirror.overlayMode(mode, overlay, true);
});


// Because some browsers don't support this functionality yet
if(!String.prototype.includes) {
	String.prototype.includes = function() {'use strict';
		return String.prototype.indexOf.apply(this, arguments) !== -1;
	};
}