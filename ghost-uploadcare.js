/* 
 * Test integration with Uploadcare
 */

// GLOBAL VARIABLES
UPLOADCARE_PUBLIC_KEY = 'demopublickey';
UPLOADCARE_CROP = '';

(function() {

    // Uploadcare initialization process
    var init = function() {

        // Create widget
        var widget = uploadcare.Widget(
            '[role=uploadcare-uploader][data-images-only][data-preview-step][data-crop]'
        );
        widget.onUploadComplete(function(fileInfo) {
            var editor = $('.CodeMirror')[0].CodeMirror;
            var element = '![' + fileInfo.name + '](' + fileInfo.cdnUrl + ')';
            editor.replaceSelection(element);
        });

        // Create button
        var btn = $('<a href="#" class="ember-view nav-item"><img src="https://ucarecdn.com/assets/images/third_design/site-logo.png" style="margin:15px 0"></a>');
        btn.click(function() {widget.openDialog(); return false});

        // Add button to the navigation panel when Ember loads
        var add_to_nav = function() {
            var nav = $('nav.global-nav');
            if (nav) setTimeout(function() {nav.append(btn)}, 1000); else setTimeout(add_to_nav, 1000);
        }
        setTimeout(add_to_nav, 1000);

    };

    // Load library
    var prefix = ('https:' == document.location.protocol ? 'https://' : 'http://www.');
    var filename = (prefix + 'ucarecdn.com/widget/1.4.4/uploadcare/uploadcare-1.4.4.min.js');
    var fileref=document.createElement('script');
    fileref.setAttribute("type","text/javascript");
    fileref.setAttribute("src", filename);
    fileref.onreadystatechange= function () {
        if (this.readyState == 'complete') init();
    }
    fileref.onload = init;

    if (typeof fileref!="undefined") document.getElementsByTagName("head")[0].appendChild(fileref);

})();
