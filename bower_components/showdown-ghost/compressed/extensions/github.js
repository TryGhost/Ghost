//
//  Github Extension (WIP)
//  ~~strike-through~~   ->  <del>strike-through</del>
//
(function(){var a=function(a){return[{type:"lang",regex:"(~T){2}([^~]+)(~T){2}",replace:function(a,b,c,d){return"<del>"+c+"</del>"}}]};typeof window!="undefined"&&window.Showdown&&window.Showdown.extensions&&(window.Showdown.extensions.github=a),typeof module!="undefined"&&(module.exports=a)})();