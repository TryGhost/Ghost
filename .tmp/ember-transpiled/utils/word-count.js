define("ghost/utils/word-count", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // jscs: disable
    function wordCount(s) {
        s = s.replace(/(^\s*)|(\s*$)/gi, ''); // exclude  start and end white-space
        s = s.replace(/[ ]{2,}/gi, ' '); // 2 or more space to 1
        s = s.replace(/\n /gi, '\n'); // exclude newline with a start spacing
        s = s.replace(/\n+/gi, '\n');

         var ch = /[\u4E00-\u9FA5\uF900-\uFA2D]/gi;
            var en = /[^\u4e00-\u9fa5]/gi;
            var s_en = s.replace(ch,'');
            var s_cn = s.replace(en,'');
            var en_cnt = s_en.split(/ |\n/).length;
            var cn_cnt = s_cn.length;

            //console.log('EN:' + en_cnt + ' & CN:' + cn_cnt );

            return en_cnt + cn_cnt;

        //return s.split(/ |\n/).length;
    }

    __exports__["default"] = wordCount;
  });