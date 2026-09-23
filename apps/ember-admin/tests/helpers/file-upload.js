import {triggerEvent} from '@ember/test-helpers';

export function createFile(content = ['test'], options = {}) {
    const {
        name,
        type
    } = options;

    const file = new Blob(content, {type: type ? type : 'text/plain'});
    file.name = name ? name : 'test.txt';

    return file;
}

export function fileUpload(target, content, options) {
    const file = createFile(content, options);

    return triggerEvent(
        target,
        'change',
        {files: [file]}
    );
}
