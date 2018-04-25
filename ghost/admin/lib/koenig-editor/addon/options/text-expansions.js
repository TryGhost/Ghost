import {
    replaceWithHeaderSection,
    replaceWithListSection
} from 'mobiledoc-kit/editor/text-input-handlers';
import {run} from '@ember/runloop';

// Text expansions watch text entry events and will look for matches, replacing
// the matches with additional markup, atoms, or cards
// https://github.com/bustlelabs/mobiledoc-kit#responding-to-text-input

// TODO: this was copied from our old Koenig editor, it could do with some
// comments, cleanup, and refactoring

export default function (editor, koenig) {
    // We don't want to run all our content rules on every text entry event,
    // instead we check to see if this text entry event could match a content
    // rule, and only then run the rules. Right now we only want to match
    // content ending with *, _, ), ~, and `. This could increase as we support
    // more markdown.

    editor.onTextInput({
        name: 'inline_markdown',
        match: /[*_)~`]$/,
        run(editor, matches) {
            let text = editor.range.head.section.textUntil(editor.range.head);

            switch (matches[0]) {
            case '*':
                matchStrongStar(editor, text);
                matchEmStar(editor, text);
                break;
            case '_':
                matchStrongUnderscore(editor, text);
                matchEmUnderscore(editor, text);
                break;
            case ')':
                matchLink(editor, text);
                matchImage(editor, text);
                break;
            case '~':
                matchStrikethrough(editor, text);
                break;
            case '`':
                matchCode(editor, text);
                break;
            }
        }
    });

    /* block level markdown ------------------------------------------------- */

    // mobiledoc-kit has `* ` already built-in so we only need to add `- `
    editor.onTextInput({
        name: 'md_ul',
        match: /^- $/,
        run(editor) {
            replaceWithListSection(editor, 'ul');
        }
    });

    editor.onTextInput({
        name: 'md_blockquote',
        match: /^> $/,
        run(editor) {
            replaceWithHeaderSection(editor, 'blockquote');
        }
    });

    editor.onTextInput({
        name: 'md_hr',
        match: /^---$/,
        run(editor) {
            let {range: {head, head: {section}}} = editor;

            // Skip if cursor is not at end of section
            if (!head.isTail()) {
                return;
            }

            // Skip if section is a list item
            if (section.isListItem) {
                return;
            }

            koenig.send('replaceWithCardSection', 'hr', section.toRange());
        }
    });

    /* inline markdown ------------------------------------------------------ */

    function matchStrongStar(editor, text) {
        let {range} = editor;
        let matches = text.match(/(?:^|\s)\*\*([^\s*]+|[^\s*][^*]*[^\s])\*\*/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let bold = postEditor.builder.createMarkup('strong');
                postEditor.insertTextWithMarkup(position, matches[1], [bold]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('strong');
            });
        }
    }

    function matchStrongUnderscore(editor, text) {
        let {range} = editor;
        let matches = text.match(/(?:^|\s)__([^\s_]+|[^\s_][^_]*[^\s])__/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let bold = postEditor.builder.createMarkup('strong');
                postEditor.insertTextWithMarkup(position, matches[1], [bold]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('strong');
            });
        }
    }

    function matchEmStar(editor, text) {
        let {range} = editor;
        // (?:^|\s)     - match beginning of input or a starting space (don't capture)
        // \*           - match leading *
        // (            - start capturing group
        //   [^\s*]+    - match a stretch with no spaces or * chars
        //   |          - OR
        //   [^\s*]     - match a single non-space or * char    | this group will only match at
        //   [^*]*      - match zero or more non * chars        | least two chars so we need the
        //   [^\s]      - match a single non-space char         | [^\s*]+ to match single chars
        // )            - end capturing group
        // \*           - match trailing *
        //
        // input = " *foo*"
        // matches[0] = " *foo*"
        // matches[1] = "foo"
        let matches = text.match(/(?:^|\s)\*([^\s*]+|[^\s*][^*]*[^\s])\*/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let em = postEditor.builder.createMarkup('em');
                postEditor.insertTextWithMarkup(position, matches[1], [em]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('em');
            });
        }
    }

    function matchEmUnderscore(editor, text) {
        let {range} = editor;
        let matches = text.match(/(?:^|\s)_([^\s_]+|[^\s_][^_]*[^\s])_/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let em = postEditor.builder.createMarkup('em');
                postEditor.insertTextWithMarkup(position, matches[1], [em]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('em');
            });
        }
    }

    function matchStrikethrough(editor, text) {
        let {range} = editor;
        let matches = text.match(/(?:^|\s)~~([^\s~]+|[^\s~][^~]*[^\s])~~/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let s = postEditor.builder.createMarkup('s');
                postEditor.insertTextWithMarkup(position, matches[1], [s]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('s');
            });
        }
    }

    function matchCode(editor, text) {
        let {range} = editor;
        let matches = text.match(/(?:^|\s)`([^\s`]+|[^\s`][^`]*[^\s`])`/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let code = postEditor.builder.createMarkup('code');
                postEditor.insertTextWithMarkup(position, matches[1], [code]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('code');
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
                postEditor.insertTextWithMarkup(position, text, [a]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('a');
            });
        }
    }

    function matchImage(editor, text) {
        let matches = text.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (matches) {
            let {range: {head, head: {section}}} = editor;
            let src = matches[2];
            let alt = matches[1];

            // skip if cursor is not at end of section
            if (!head.isTail()) {
                return;
            }

            // mobiledoc lists don't support cards
            if (section.isListItem) {
                return;
            }

            editor.run((postEditor) => {
                let card = postEditor.builder.createCardSection('image', {src, alt});
                // need to check the section before replacing else it will always
                // add a trailing paragraph
                let needsTrailingParagraph = !section.next;

                editor.range.extend(-(matches[0].length));
                postEditor.replaceSection(editor.range.headSection, card);

                if (needsTrailingParagraph) {
                    let newSection = editor.builder.createMarkupSection('p');
                    postEditor.insertSectionAtEnd(newSection);
                    postEditor.setRange(newSection.tailPosition());
                }
            });
        }
    }
}
