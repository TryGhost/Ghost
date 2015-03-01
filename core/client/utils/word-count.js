// jscs: disable
function wordCount(s) {
    s = s.replace(/<(.|\n)*?>/g, ' '); // strip tags
    s = s.replace(/[^\w\s]/g, ''); // ignore non-alphanumeric letters
    s = s.replace(/(^\s*)|(\s*$)/gi, ''); // exclude starting and ending white-space
    s = s.replace(/\n /gi, ' '); // convert newlines to spaces
    s = s.replace(/\n+/gi, ' ');
    s = s.replace(/[ ]{2,}/gi, ' '); // convert 2 or more spaces to 1

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

export default wordCount;
