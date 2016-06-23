// # Outline Helper
// Usage: `{{outline}}`

var hbs          = require('express-hbs'),
    _            = require('lodash'),
    marked       = require('marked'),
    ignore_regex = /```[^`]*```/gm,
    title_regex  = /(^#{1,3}?\s?(?!#).+)+/gm,
    outline;

outline = function (options) {
  // コード内で該当する文を削除
  var markdown = this.markdown.replace(ignore_regex, '');
  // h1-h3タグに該当する要素
  var mds = markdown.match(title_regex);
  var html = "<div class='outline'><div class='navbar'>{{replace}}</div></div>";
  // タイトルを先頭にする
  var id = escape(this.title).replace(/%/g, '');
  var replace = "- [" + this.title + "](#" + id + ")\n";
  _.each(mds, function (md, i) {
    var sharps = md.match(/(^#{1,3})\s?/);
    var mdo = {
      h: sharps[1].length, // 『#』の数
      text: md.match(/(^#{1,3}\s?(?!#).+)/g)[0].slice(sharps[0].length).trim() // テキスト部抽出
    };
    // markdownなのでリスト階層化のための空白挿入
    id = escape(mdo.text).replace(/[%\.]/g, '');
    replace += _.repeat('    ', mdo.h-1) + "- [" + mdo.text + "](#" + id + ")\n";
  });
  html = html.replace(/\{\{replace\}\}/, marked(replace));
  return new hbs.handlebars.SafeString(html);
};

module.exports = outline;
