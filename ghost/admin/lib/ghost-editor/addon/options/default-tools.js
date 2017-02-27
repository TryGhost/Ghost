import Ember from 'ember';

export default function (editor, toolbar) {
    return [
        {
            name: "h1",
            icon: "",
            label: "Heading One",
            visibility: 'primary',
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('h1');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'h1').length > 0);
            }
        },
        {
            name: "h2",
            label: "Heading Two",
            icon: "",
            selected: false,
            type: 'block',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('h2');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'h2').length > 0);
            }
        },
        {
            name: "h3",
            label: "Heading Three",
            icon: "",
            selected: false,
            type: 'block',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('h3');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'h3').length > 0);
            }
        },
        {
            name: "p",
            label: "Paragraph",
            icon: "paragraph.svg",
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('p');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'p').length > 0);
            }
        },
        {
            name: "blockquote",
            label: "Block Quote",
            icon: "quote.svg",
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('blockquote');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'blockquote').length > 0);
            }
        },
        // {
        //     name: "pullquote",
        //     label: 'Pull Quote',
        //     icon: "pullquote.svg",
        //     selected: false,
        //     type: 'block',
        //     onClick: (editor) => {
        //         editor.run(postEditor => {
        //             postEditor.toggleSection('pull-quote');
        //         });
        //     },
        //     checkElements: function (elements) {
        //         Ember.set(this, "selected", elements.filter(element => element.tagName === 'pull-quote').length > 0);
        //     }
        // },
        {
            name: "ul",
            label: "List Unordered",
            icon: "list-bullets.svg",
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('ul');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'ul').length > 0);
            }
        },
        {
            name: "ol",
            label: "List Ordered",
            icon: "list-number.svg",
            selected: false,
            type: 'block',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleSection('ol');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'ol').length > 0);
            }
        },
        {
            name: "b",
            label: "Bold",
            icon: "bold.svg",
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('strong');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'strong').length > 0);
            }
        },
        {
            name: "i",
            label: "Italic",
            icon: "italic.svg",
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('em');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'em').length > 0);
            }
        },
        {
            name: "a",
            label: "Link",
            icon: "link.svg",
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                //editor.run(postEditor => {
                // let range = window.getSelection().getRangeAt(0).cloneRange();
                //toolbar.set('isLink', true);

                //toolbar.set('linkRange', );
                //toolbar.$('input').focus();
                toolbar.doLink(editor.range);
                //});
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'a').length > 0);
            }
        },
        {
            name: "u",
            label: "Underline",
            icon: "underline.svg",
            selected: false,
            type: 'markup',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('u');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'u').length > 0);
            }
        },
        {
            name: "s",
            label: "Strikethrough",
            icon: "strikethrough.svg",
            selected: false,
            type: 'markup',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('s');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 's').length > 0);
            }
        },
        /*{
            name: "sub",
            label: "Subscript",
            icon: "subscript.svg",
            selected: false,
            type: 'markup',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('sub');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'sub').length > 0);
            }
        },
        {
            name: "sup",
            label: "Superscript",
            icon: "superscript.svg",
            selected: false,
            type: 'markup',
            onClick: (editor) => {
                editor.run(postEditor => {
                    postEditor.toggleMarkup('sup');
                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'sup').length > 0);
            }
        },*/
        {
            name: "img",
            label: "Image",
            selected: false,
            type: 'card',
            icon: 'file-picture-add.svg',
            visibility: "primary",
            onClick: (editor) => {
                editor.run(postEditor => {
                    let card = postEditor.builder.createCardSection('image-card', {pos: "top"});
                    postEditor.replaceSection(editor.range.headSection, card);

                });
            },
            checkElements: function (elements) {
                Ember.set(this, "selected", elements.filter(element => element.tagName === 'sup').length > 0);
            }
        },
        {
            name: "html",
            label: "Embed HTML",
            selected: false,
            type: 'card',
            icon: 'html-five.svg',
            visibility: "primary",
            onClick: (editor) => {
                editor.run(postEditor => {
                    let card = postEditor.builder.createCardSection('html-card', {pos: "top"});
                    postEditor.replaceSection(editor.range.headSection, card);
                });
            },
            checkElements: function () {

            }
        },
        {
            name: "md",
            label: "Embed Markdown",
            selected: false,
            type: 'card',
            visibility: "primary",
            icon: 'file-code-1.svg',
            onClick: (editor) => {
                editor.run(postEditor => {
                    let card = postEditor.builder.createCardSection('markdown-card', {pos: "top"});
                    postEditor.replaceSection(editor.range.headSection, card);
                });
            },
            checkElements: function () {

            }
        }
    ];
}

