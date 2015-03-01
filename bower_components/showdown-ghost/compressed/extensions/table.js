/*global module:true*//*
 * Basic table support with re-entrant parsing, where cell content
 * can also specify markdown.
 *
 * Tables
 * ======
 *
 * | Col 1   | Col 2                                              |
 * |======== |====================================================|
 * |**bold** | ![Valid XHTML] (http://w3.org/Icons/valid-xhtml10) |
 * | Plain   | Value                                              |
 *
 */(function(){var a=function(a){var b={},c="text-align:left;",d;return b.th=function(a){if(a.trim()==="")return"";var b=a.trim().replace(/ /g,"_").toLowerCase();return'<th id="'+b+'" style="'+c+'">'+a+"</th>"},b.td=function(b){return'<td style="'+c+'">'+a.makeHtml(b)+"</td>"},b.ths=function(){var a="",c=0,d=[].slice.apply(arguments);for(c;c<d.length;c+=1)a+=b.th(d[c])+"\n";return a},b.tds=function(){var a="",c=0,d=[].slice.apply(arguments);for(c;c<d.length;c+=1)a+=b.td(d[c])+"\n";return a},b.thead=function(){var a,c=0,d=[].slice.apply(arguments);return a="<thead>\n",a+="<tr>\n",a+=b.ths.apply(this,d),a+="</tr>\n",a+="</thead>\n",a},b.tr=function(){var a,c=0,d=[].slice.apply(arguments);return a="<tr>\n",a+=b.tds.apply(this,d),a+="</tr>\n",a},d=function(a){var c=0,d=a.split("\n"),e=[],f,g,h,i=[];for(c;c<d.length;c+=1){f=d[c];if(f.trim().match(/^[|]{1}.*[|]{1}$/)){f=f.trim(),e.push("<table>"),g=f.substring(1,f.length-1).split("|"),e.push(b.thead.apply(this,g)),f=d[++c];if(!!f.trim().match(/^[|]{1}[-=| ]+[|]{1}$/)){f=d[++c],e.push("<tbody>");while(f.trim().match(/^[|]{1}.*[|]{1}$/))f=f.trim(),e.push(b.tr.apply(this,f.substring(1,f.length-1).split("|"))),f=d[++c];e.push("</tbody>"),e.push("</table>"),i.push(e.join("\n"));continue}f=d[--c]}i.push(f)}return i.join("\n")},[{type:"lang",filter:d}]};typeof window!="undefined"&&window.Showdown&&window.Showdown.extensions&&(window.Showdown.extensions.table=a),typeof module!="undefined"&&(module.exports=a)})();