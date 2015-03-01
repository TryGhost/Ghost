YUI().use('node', function(Y) {
    var code = Y.all('.prettyprint.linenums');
    if (code.size()) {
        code.each(function(c) {
            var lis = c.all('ol li'),
                l = 1;
            lis.each(function(n) {
                n.prepend('<a name="LINENUM_' + l + '"></a>');
                l++;
            });
        });
        var h = location.hash;
        location.hash = '';
        h = h.replace('LINE_', 'LINENUM_');
        location.hash = h;
    }
});
