import {set} from '@ember/object';

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
                editor.run((postEditor) => {
                    postEditor.toggleSection('h1');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'h1').length > 0);
            }
        },
        {
            name: 'H2',
            class: 'h2',
            label: 'Heading Two',
            icon: '',
            selected: false,
            type: 'block',
            visibility: 'primary',
            toolbar: true,
            onClick: (editor) => {
                editor.run((postEditor) => {
                    postEditor.toggleSection('h2');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'h2').length > 0);
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
                editor.run((postEditor) => {
                    postEditor.toggleSection('h3');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'h3').length > 0);
            }
        },
        {
            name: 'p',
            label: 'Text',
            icon: 'text.svg',
            selected: false,
            type: 'block',
            order: 0,
            cardMenu: true,
            onClick: (editor) => {
                editor.run((postEditor) => {
                    postEditor.toggleSection('p');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'p').length > 0);
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
                editor.run((postEditor) => {
                    postEditor.toggleSection('blockquote');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'blockquote').length > 0);
            }
        },
        {
            name: 'ul',
            label: 'Bullet List',
            icon: 'list-bullet.svg',
            selected: false,
            type: 'block',
            order: 5,
            cardMenu: true,
            onClick: (editor) => {
                editor.run((postEditor) => {
                    postEditor.toggleSection('ul');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'ul').length > 0);
            }
        },
        {
            name: 'ol',
            label: 'Number List',
            icon: 'list-number.svg',
            selected: false,
            type: 'block',
            order: 6,
            cardMenu: true,
            onClick: (editor) => {
                editor.run((postEditor) => {
                    postEditor.toggleSection('ol');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'ol').length > 0);
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
                editor.run((postEditor) => {
                    postEditor.toggleMarkup('strong');
                });
            },
            checkElements(/* elements */) {
                set(this, 'selected', true);
                // set(this, 'selected', elements.filter((element) => element.tagName === 'strong').length > 0);
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
                editor.run((postEditor) => {
                    postEditor.toggleMarkup('em');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'em').length > 0);
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
                editor.run((postEditor) => {
                    postEditor.toggleMarkup('s');
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 's').length > 0);
            }
        },
        {
            name: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" fill="none"><path d="M14.5 12.5l.086.086c.781.781 2.047.781 2.828 0l3.965-3.964c1.166-1.167 1.166-3.075 0-4.243l-1.758-1.757c-1.166-1.167-3.076-1.167-4.242 0l-3.965 3.964c-.781.781-.781 2.047 0 2.829l.086.085M9.5 11.5l-.086-.085c-.781-.781-2.047-.781-2.828 0l-3.965 3.964c-1.166 1.167-1.166 3.076 0 4.243l1.758 1.757c1.166 1.167 3.076 1.167 4.242 0l3.965-3.964c.781-.781.781-2.047 0-2.829l-.086-.086M8.111 15.889l7.778-7.778"/></g></svg>',
            label: 'Link',
            class: 'link',
            icon: 'link.svg',
            selected: false,
            type: 'markup',
            visibility: 'primary',
            onClick: (editor) => {
                toolbar.send('doLink', editor.range);
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'a').length > 0);
            }
        },
        {
            name: 'img',
            label: 'Image',
            selected: false,
            type: 'card',
            icon: 'photos.svg',
            visibility: 'primary',
            order: 2,
            cardMenu: true,
            onClick: (editor) => {
                editor.run((postEditor, section) => {
                    let thisSection = section || editor.range.headSection;
                    let card = postEditor.builder.createCardSection('card-image', {pos: 'top', newlyCreated: true});
                    if (thisSection.text.length) {
                        postEditor.insertSection(card);
                    } else {
                        postEditor.replaceSection(thisSection, card);
                    }
                    // insert empty paragraph after card if it's the last element.
                    if (!thisSection.next) {
                        let newSection = editor.builder.createMarkupSection('p');
                        postEditor.insertSectionAtEnd(newSection);
                    }
                });
            },
            checkElements(elements) {
                set(this, 'selected', elements.filter(element => element.tagName === 'sup').length > 0);
            }
        },
        {
            name: 'html',
            label: 'Embed',
            selected: false,
            type: 'card',
            icon: 'brackets.svg',
            visibility: 'primary',
            order: 3,
            cardMenu: true,
            onClick: (editor, section) => {
                editor.run((postEditor) => {
                    let thisSection = section || editor.range.headSection;
                    let card = postEditor.builder.createCardSection('card-html', {pos: 'top', html: thisSection.text, newlyCreated: true});
                    // we can't replace a list item so we insert a card after it and then delete it.
                    if (thisSection.isListItem) {
                        editor.insertCard('card-html');
                    } else {
                        postEditor.replaceSection(thisSection, card);
                    }

                    if (!thisSection.next) {
                        let newSection = editor.builder.createMarkupSection('p');
                        postEditor.insertSectionAtEnd(newSection);
                    }
                });
            },
            checkElements() {

            }
        },
        {
            name: 'hr',
            label: 'Divider',
            selected: false,
            type: 'card',
            icon: 'line.svg',
            visibility: 'primary',
            order: 4,
            cardMenu: true,
            onClick: (editor, section) => {
                editor.run((postEditor) => {
                    let thisSection = section || editor.range.headSection;
                    let card = postEditor.builder.createCardSection('card-hr', {pos: 'top', newlyCreated: true});
                    if (thisSection.text.length) {
                        postEditor.insertSection(card);
                    } else {
                        postEditor.replaceSection(thisSection, card);
                    }

                    if (!thisSection.next) {
                        let newSection = editor.builder.createMarkupSection('p');
                        postEditor.insertSectionAtEnd(newSection);
                    }
                });
            },
            checkElements() {
            }
        },
        {
            name: 'md',
            label: 'Markdown',
            selected: false,
            type: 'card',
            visibility: 'primary',
            icon: 'markdown.svg',
            order: 1,
            cardMenu: true,
            onClick: (editor, section) => {
                editor.run((postEditor) => {
                    let thisSection = section || editor.range.headSection;
                    let card = postEditor.builder.createCardSection('card-markdown', {pos: 'top', markdown: thisSection.text, newlyCreated: true});
                    // we can't replace a list item so we insert a card after it and then delete it.
                    if (thisSection.isListItem) {
                        editor.insertCard('card-markdown');
                    } else {
                        postEditor.replaceSection(thisSection, card);
                    }
                    // if this is the last element then insert a paragraph after the card
                    if (!thisSection.next) {
                        let newSection = editor.builder.createMarkupSection('p');
                        postEditor.insertSectionAtEnd(newSection);
                    }
                });
            },
            checkElements() {

            }
        }
    ];
}
