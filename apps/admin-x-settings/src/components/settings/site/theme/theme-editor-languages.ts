import {getExtension} from './theme-editor-utils';

export const getLanguageExtension = (path: string) => {
    const extension = getExtension(path);

    switch (extension) {
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
        return import('@codemirror/lang-css').then(module => module.css());
    case 'js':
    case 'cjs':
    case 'mjs':
        return import('@codemirror/lang-javascript').then(module => module.javascript());
    case 'json':
        return import('@codemirror/lang-json').then(module => module.json());
    case 'md':
    case 'markdown':
        return import('@codemirror/lang-markdown').then(module => module.markdown());
    case 'yaml':
    case 'yml':
        return import('@codemirror/lang-yaml').then(module => module.yaml());
    case 'hbs':
    case 'handlebars':
    case 'html':
    case 'htm':
    case 'svg':
    case 'xml':
        return import('@codemirror/lang-html').then(module => module.html());
    default:
        return import('@codemirror/lang-html').then(module => module.html());
    }
};

export const getLanguageLabel = (path: string) => {
    const extension = getExtension(path);

    if (!extension) {
        return 'text';
    }

    switch (extension) {
    case 'hbs':
        return 'handlebars';
    case 'htm':
        return 'html';
    case 'yml':
        return 'yaml';
    default:
        return extension;
    }
};
