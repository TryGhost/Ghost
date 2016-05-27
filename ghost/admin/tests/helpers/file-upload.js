/* global Blob */
import Ember from 'ember';

export function createFile(content = ['test'], options = {}) {
    let {
        name,
        type
    } = options;

    let file = new Blob(content, {type: type ? type : 'text/plain'});
    file.name = name ? name : 'test.txt';

    return file;
}

export function fileUpload($element, content, options) {
    let file = createFile(content, options);
    let event = Ember.$.Event('change', {
        testingFiles: [file]
    });

    $element.trigger(event);
}

export default Ember.Test.registerAsyncHelper('fileUpload', function(app, selector, content, options) {
    let file = createFile(content, options);

    return triggerEvent(
        selector,
        'change',
        {foor: 'bar', testingFiles: [file]}
    );
});
