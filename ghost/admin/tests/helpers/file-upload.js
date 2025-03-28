import {triggerEvent} from '@ember/test-helpers';

export function createFile(content = ['test'], options = {}) {
    let {
        name,
        type
    } = options;

    let file = new Blob(content, {type: type ? type : 'text/plain'});
    file.name = name ? name : 'test.txt';

    return file;
}

export function fileUpload(target, content, options) {
    let file = createFile(content, options);

    return triggerEvent(
        target,
        'change',
        {files: [file]}
    );
}
