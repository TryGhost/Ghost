//
//  Google Prettify
//  A showdown extension to add Google Prettify (http://code.google.com/p/google-code-prettify/)
//  hints to showdown's HTML output.
//
(function(){var a=function(a){return[{type:"output",filter:function(a){return a.replace(/(<pre>)?<code>/gi,function(a,b){return b?'<pre class="prettyprint linenums" tabIndex="0"><code data-inner="1">':'<code class="prettyprint">'})}}]};typeof window!="undefined"&&window.Showdown&&window.Showdown.extensions&&(window.Showdown.extensions.prettify=a),typeof module!="undefined"&&(module.exports=a)})();