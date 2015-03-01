//
//  Twitter Extension
//  @username   ->  <a href="http://twitter.com/username">@username</a>
//  #hashtag    ->  <a href="http://twitter.com/search/%23hashtag">#hashtag</a>
//
(function(){var a=function(a){return[{type:"lang",regex:"\\B(\\\\)?@([\\S]+)\\b",replace:function(a,b,c){return b==="\\"?a:'<a href="http://twitter.com/'+c+'">@'+c+"</a>"}},{type:"lang",regex:"\\B(\\\\)?#([\\S]+)\\b",replace:function(a,b,c){return b==="\\"?a:'<a href="http://twitter.com/search/%23'+c+'">#'+c+"</a>"}},{type:"lang",regex:"\\\\@",replace:"@"}]};typeof window!="undefined"&&window.Showdown&&window.Showdown.extensions&&(window.Showdown.extensions.twitter=a),typeof module!="undefined"&&(module.exports=a)})();