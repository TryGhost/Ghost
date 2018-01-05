/* global Blob */
import $ from 'jquery';
import {registerAsyncHelper} from '@ember/test';

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
    // eslint-disable-next-line new-cap
    let event = $.Event('change', {
        testingFiles: [file]
    });

    $element.trigger(event);
}

export default registerAsyncHelper('fileUpload', function (app, selector, content, options) {
    let file = createFile(content, options);

    return triggerEvent(
        selector,
        'change',
        {testingFiles: [file]}
    );
});
