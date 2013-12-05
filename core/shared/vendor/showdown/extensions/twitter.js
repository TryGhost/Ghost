//
//  Twitter Extension
//  Automatically turn any Twitter permalink into an embeddable tweet
//  (only when the permalink is at the beginning of the line)
//
//  e.g. https://twitter.com/xdamman/status/408455694241636352 becomes
//  <blockquote class="twitter-tweet">
//    <a href="https://twitter.com/xdamman/statuses/408455694241636352">Tweet from @xdamman</a>
//  </blockquote>
//  <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>
//

(function () {
    var twitter = function (converter) {
        return [
            {
                type    : 'lang',
                regex   : '\n(https?:\/\/twitter\.com\/([^\/]{1,15})\/status(es)?\/[0-9]{1,100})',
                replace : function (match, permalink, username) {
                    // If we are in the editor, adding the script tag with innerHTML does not load the script
                    // So we need to manually load it
                    if (typeof document == 'object' && document.createElement) { 
                      if(typeof twttr == 'undefined') {
                        var s = document.createElement("script");
                        s.src = "//platform.twitter.com/widgets.js";
                        document.body.appendChild(s);
                      }
                      else if(twttr && twttr.widgets && twttr.widgets.load) {
                        setTimeout(twttr.widgets.load, 0);
                      }
                    }
                    return '<blockquote class="twitter-tweet"><a href="'+permalink+'">Tweet from @'+username+'</a></blockquote><script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>';
                }
            }
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) { window.Showdown.extensions.twitter = twitter; }
    // Server-side export
    if (typeof module !== 'undefined') module.exports = twitter;
}());

