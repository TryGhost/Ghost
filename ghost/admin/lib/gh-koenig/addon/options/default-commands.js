/* eslint-disable ember-suave/prefer-destructuring, no-unused-vars */
import {replaceWithListSection, replaceWithHeaderSection} from 'mobiledoc-kit/editor/text-input-handlers';

export default function (editor) {

    // We don't want to run all our content rules on every text entry event, instead we check to see if this text entry
    // event could match a content rule, and only then run the rules.
    // Right now we only want to match content ending with *, _, ), ~, and `. This could increase as we support more
    // markdown.

    editor.onTextInput({
        name: 'inline_markdown',
        match: /[*_)~`]$/,
        run(postEditor, matches) {
            let text = postEditor.range.head.section.textUntil(postEditor.range.head);

            switch (matches[0]) {
            case '*':
                matchStrongStar(postEditor, text);
                matchEmStar(postEditor, text);
                break;
            case '_':
                matchStrongUl(postEditor, text);
                matchEmUl(postEditor, text);
                break;
            case ')':
                matchLink(postEditor, text);
                matchImage(postEditor, text);
                break;
            case '~':
                matchStrikethrough(postEditor, text);
                break;
            case '`':
                matchMarkdown(postEditor, text);
                break;
            }
        }
    });

    // block level markdown
    editor.onTextInput({
        name: 'dashul',
        match: /^- $/,
        run(editor) {
            replaceWithListSection(editor, 'ul');
        }
    });

    editor.onTextInput({
        name: 'blockquote',
        match: /^> $/,
        run(editor) {
            replaceWithHeaderSection(editor, 'blockquote');
        }
    });

    // soft return
    let softReturnKeyCommand = {
        str: 'SHIFT+ENTER',

        run(editor) {
            editor.run((postEditor) => {
                let mention = postEditor.builder.createAtom('soft-return');
                postEditor.insertMarkers(editor.range.head, [mention]);
            });
        }
    };
    editor.registerKeyCommand(softReturnKeyCommand);

    // inline matches
    function matchStrongStar(editor, text) {
        let {range} = editor;
        let matches = text.match(/\*\*(.+?)\*\*$/);
        if (matches) {
            range = range.extend(-(matches[0].length));
            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let bold = postEditor.builder.createMarkup('strong');
                let nextPosition = postEditor.insertTextWithMarkup(position, matches[1], [bold]);
                postEditor.insertTextWithMarkup(nextPosition, '', []);
            });
        }
    }

    function matchStrongUl(editor, text) {
        let {range} = editor;
        let matches = text.match(/__(.+?)__$/);
        if (matches) {
            range = range.extend(-(matches[0].length));
            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let bold = postEditor.builder.createMarkup('strong');
                let nextPosition = postEditor.insertTextWithMarkup(position, matches[1], [bold]);
                postEditor.insertTextWithMarkup(nextPosition, '', []);
            });
        }
    }

    function matchEmStar(editor, text) {
        let {range} = editor;
        let matches = text.match(/(^|[^\*])\*([^\*].*?)\*$/);
        if (matches) {
            let match = matches[0][0] === '*' ? matches[0] : matches[0].substr(1);
            range = range.extend(-(match.length));
            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let em = postEditor.builder.createMarkup('em');
                let nextPosition = postEditor.insertTextWithMarkup(position, matches[2], [em]);
                postEditor.insertTextWithMarkup(nextPosition, '', []);
            });
        }
    }

    function matchEmUl(editor, text) {
        let {range} = editor;
        let matches = text.match(/(^|[^_])_([^_].+?)_$/);
        if (matches) {
            let match = matches[0][0] === '_' ? matches[0] : matches[0].substr(1);
            range = range.extend(-(match.length));
            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let em = postEditor.builder.createMarkup('em');
                let nextPosition = postEditor.insertTextWithMarkup(position, matches[2], [em]);
                postEditor.insertTextWithMarkup(nextPosition, '', []);
            });
        }
    }

    function matchLink(editor, text) {
        let {range} = editor;
        let matches = text.match(/(^|[^!])\[(.*?)\]\((.*?)\)$/);
        if (matches) {
            let url = matches[3];
            let text = matches[2];
            let match = matches[0][0] === '[' ? matches[0] : matches[0].substr(1);
            range = range.extend(-match.length);
            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let a = postEditor.builder.createMarkup('a', {href: url});
                let nextPosition = postEditor.insertTextWithMarkup(position, text, [a]);
                postEditor.insertTextWithMarkup(nextPosition, '', []); // insert the un-marked-up space
            });
        }
    }

    function matchImage(editor, text) {
        let {range} = editor;
        let matches = text.match(/!\[(.*?)\]\((.*?)\)$/);
        if (matches) {
            let img = matches[2];
            let alt = matches[1];

            range = range.extend(-(matches[0].length));
            editor.run((postEditor) => {
                let card = postEditor.builder.createCardSection('card-image', {pos: 'top', img, alt});
                postEditor.replaceSection(editor.range.headSection, card);
                if (!editor.range.headSection.next) {
                    let newSection = editor.builder.createMarkupSection('p');
                    postEditor.insertSectionAtEnd(newSection);
                }
            });
        }
    }

    function matchStrikethrough(editor, text) {
        let {range} = editor;
        let matches = text.match(/~~(.+?)~~$/);
        if (matches) {
            range = range.extend(-(matches[0].length));
            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let s = postEditor.builder.createMarkup('s');
                let nextPosition = postEditor.insertTextWithMarkup(position, matches[1], [s]);
                postEditor.insertTextWithMarkup(nextPosition, '', []); // insert the un-marked-up space
            });
        }
    }

    function matchMarkdown(editor, text) {
        let {range} = editor;
        let matches = text.match(/```([\s\S]*?)```$/);
        if (matches) {
            let code = matches[0];
            range = range.extend(-(matches[0].length));
            editor.run((postEditor) => {
                let card = postEditor.builder.createCardSection('card-markdown', {pos: 'top', markdown: code});
                postEditor.replaceSection(editor.range.headSection, card);
                if (!editor.range.headSection.next) {
                    let newSection = editor.builder.createMarkupSection('p');
                    postEditor.insertSectionAtEnd(newSection);
                }
            });
        }
    }
}
