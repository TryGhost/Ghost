import Ember from 'ember';

export default function (editor, toolbar) {
    return [
        {
            name: 'H1',
            class: 'h1',
            icon: '',
            label: 'Heading One',
            visibility: 'primary',
            selected: false,
            type: 'block',
            toolbar: true,
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('h1');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'h1').length > 0);
            }
        },
        {
            name: 'H2',
            class:'h2',
            label: 'Heading Two',
            icon: '',
            selected: false,
            type: 'block',
            visibility: 'primary',
            toolbar: true,
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('h2');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'h2').length > 0);
            }
        },
        {
            name: 'H3',
            label: 'Heading Three',
            icon: '',
            selected: false,
            type: 'block',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('h3');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'h3').length > 0);
            }
        },
        {
            name: 'p',
            label: 'Paragraph',
            icon: 'paragraph.svg',
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('p');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'p').length > 0);
            }
        },
        {
            name: '&ldquo;',
            label: 'Quote',
            class: 'quote',
            icon: 'quote.svg',
            selected: false,
            type: 'block',
            toolbar: true,
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('blockquote');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'blockquote').length > 0);
            }
        },
       {
            name: 'ul',
            label: 'List Unordered',
            icon: 'list-bullets.svg',
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('ul');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'ul').length > 0);
            }
        },
        {
            name: 'ol',
            label: 'List Ordered',
            icon: 'list-number.svg',
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('ol');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'ol').length > 0);
            }
        },
        {
            name: 'B',
            label: 'Bold',
            class: 'bold',
            icon: 'bold.svg',
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('strong');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'strong').length > 0);
            }
        },
        {
            name: 'I',
            label: 'Italic',
            class: 'italic',
            icon: 'italic.svg',
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('em');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'em').length > 0);
            }
        },
        {
            name: 'S',
            label: 'Strike',
            class: 'strike',
            icon: 'strikethrough.svg',
            selected: false,
            type: 'markup',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('s');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 's').length > 0);
            }
        },
        {
            name: 'L',
            label: 'Link',
            class: 'link',
            icon: 'link.svg',
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                toolbar.doLink(editor.range);
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'a').length > 0);
            }
        },


        {
            name: 'img',
            label: 'Image',
            selected: false,
            type: 'card',
            icon: 'file-picture-add.svg',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    let card = postEditor.builder.createCardSection('image-card', {pos: 'top'});
                    postEditor.replaceSection(editor.range.headSection, card);

                });
            },
            checkElements: function (elements) {
                Ember.set(this, 'selected', elements.filter(element => element.tagName === 'sup').length > 0);
            }
        },
        {
            name: 'html',
            label: 'Embed HTML',
            selected: false,
            type: 'card',
            icon: 'html-five.svg',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    let card = postEditor.builder.createCardSection('html-card', {pos: 'top'});
                    postEditor.replaceSection(editor.range.headSection, card);
                });
            },
            checkElements: function () {

            }
        },
        {
            name: 'md',
            label: 'Embed Markdown',
            selected: false,
            type: 'card',
            visibility: 'primary',
            icon: 'file-code-1.svg',
            onClick: (editor) => {
                editor.run(postEditor => {
                    let card = postEditor.builder.createCardSection('markdown-card', {pos: 'top'});
                    postEditor.replaceSection(editor.range.headSection, card);
                });
            },
            checkElements: function () {

            }
        }
    ];
}

