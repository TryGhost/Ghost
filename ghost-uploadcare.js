/* 
 * Test integration with Uploadcare
 */

// GLOBAL VARIABLES
UPLOADCARE_PUBLIC_KEY = 'demopublickey';
UPLOADCARE_CROP = '';

(function() {

    // Uploadcare initialization process
    var widget_creation = function() {

        // Creating widget
        var widget = uploadcare.Widget(
            '[role=uploadcare-uploader][data-images-only][data-preview-step][data-crop]'
        );
        widget.onUploadComplete(function(fileInfo) {
            var editor = $('.CodeMirror')[0].CodeMirror;
            var element = '![' + fileInfo.name + '](' + fileInfo.cdnUrl + '/' + fileInfo.name + ')';
            editor.replaceSelection(element);
        });

        // Showing widget
        setTimeout(widget.openDialog, 5000);
    };

    // Loading library
    var prefix = ('https:' == document.location.protocol ? 'https://' : 'http://www.');
    var filename = (prefix + 'ucarecdn.com/widget/1.4.4/uploadcare/uploadcare-1.4.4.min.js');
    var fileref=document.createElement('script');
    fileref.setAttribute("type","text/javascript");
    fileref.setAttribute("src", filename);
    fileref.onreadystatechange= function () {
        if (this.readyState == 'complete') widget_creation();
    }
    fileref.onload = widget_creation;

    if (typeof fileref!="undefined") document.getElementsByTagName("head")[0].appendChild(fileref);

})();
