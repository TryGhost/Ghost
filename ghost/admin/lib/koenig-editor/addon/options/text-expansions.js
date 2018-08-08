import {run} from '@ember/runloop';

// Text expansions watch text entry events and will look for matches, replacing
// the matches with additional markup, atoms, or cards
// https://github.com/bustlelabs/mobiledoc-kit#responding-to-text-input

export function replaceWithListSection(editor, matches, listTagName) {
    let {range, range: {head, head: {section}}} = editor;
    let text = section.textUntil(head);

    // we don't want to convert to a heading if the user has not just
    // finished typing the markdown (eg, they've made a previous
    // heading expansion then Cmd-Z'ed it to get the text back then
    // starts typing at the end of the heading)
    if (text !== matches[0]) {
        return;
    }

    if (section.isListItem) {
        if (section.parent.tagName === listTagName) {
            return;
        }

        // toggle all list items to the new list type
        editor.run((postEditor) => {
            let listRange = section.parent.toRange();
            let {post} = editor;

            range = range.extend(-(matches[0].length));
            postEditor.deleteRange(range);

            let cursorListItem;
            post.walkMarkerableSections(listRange, (listItem) => {
                let isCursorListItem = listItem === section;
                let changedListItem = postEditor.changeSectionTagName(listItem, listTagName);

                if (isCursorListItem) {
                    cursorListItem = changedListItem;
                }
            });

            postEditor.setRange(cursorListItem.headPosition().toRange());
        });

        return;
    }

    editor.run((postEditor) => {
        range = range.extend(-(matches[0].length));
        let position = postEditor.deleteRange(range);
        postEditor.setRange(position);
        postEditor.toggleSection(listTagName);
    });
}

function registerInlineMarkdownTextExpansions(editor) {
    /* inline markdown ------------------------------------------------------ */

    // --\s = en dash –
    // ---. = em dash —
    // separate to the grouped replacement functions because we're matching on
    // the trailing character which can be anything
    editor.onTextInput({
        name: 'hyphens',
        match: /---?.$/,
        run(editor) {
            let {range} = editor;

            let text = editor.range.head.section.textUntil(editor.range.head);

            // do not match if we're in code formatting
            if (editor.hasActiveMarkup('code') || text.match(/[^\s]?`[^\s]/)) {
                return;
            }

            let ndashMatch = text.match(/[^-]--(\s)$/);
            if (ndashMatch) {
                let match = ndashMatch[0];
                range = range.extend(-(match.length - 1));

                if (editor.detectMarkupInRange(range, 'code')) {
                    return;
                }

                return editor.run((postEditor) => {
                    let position = postEditor.deleteRange(range);
                    postEditor.insertText(position, `–${ndashMatch[1]}`);
                });
            }

            let mdashMatch = text.match(/---([^-])$/);
            if (mdashMatch) {
                let match = mdashMatch[0];
                range = range.extend(-(match.length));

                if (editor.detectMarkupInRange(range, 'code')) {
                    return;
                }

                return editor.run((postEditor) => {
                    let position = postEditor.deleteRange(range);
                    postEditor.insertText(position, `—${mdashMatch[1]}`);
                });
            }
        }
    });

    // We don't want to run all our content rules on every text entry event,
    // instead we check to see if this text entry event could match a content
    // rule, and only then run the rules. Right now we only want to match
    // content ending with *, _, ), ~, and `. This could increase as we support
    // more markdown.

    editor.onTextInput({
        name: 'inline_markdown',
        match: /[*_)~`^]$/,
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
                matchSub(editor, text);
                matchStrikethrough(editor, text);
                break;
            case '`':
                matchCode(editor, text);
                break;
            case '^':
                matchSup(editor, text);
                break;
            }
        }
    });

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

    function matchSub(editor, text) {
        let {range} = editor;
        let matches = text.match(/(^|[^~])~([^\s~]+|[^\s~][^~]*[^\s])~/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length - matches[1].trim().length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let sub = postEditor.builder.createMarkup('sub');
                postEditor.insertTextWithMarkup(position, matches[2], [sub]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('sub');
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

    function matchSup(editor, text) {
        let {range} = editor;
        let matches = text.match(/\^([^\s^]+|[^\s^][^^]*[^\s^])\^/);
        if (matches) {
            let match = matches[0].trim();
            range = range.extend(-(match.length));

            editor.run((postEditor) => {
                let position = postEditor.deleteRange(range);
                let sup = postEditor.builder.createMarkup('sup');
                postEditor.insertTextWithMarkup(position, matches[1], [sup]);
            });

            // must be scheduled so that the toggle isn't reset automatically
            run.schedule('actions', this, function () {
                editor.toggleMarkup('sup');
            });
        }
    }

    function matchLink(editor, text) {
        let {range} = editor;
        let matches = text.match(/(?:^|\s)\[([^\s\]]+|[^\s\]][^\]]*[^\s\]])\]\(([^\s)]+|[^\s)][^)]*[^\s)])\)/);
        if (matches) {
            let url = matches[2];
            let text = matches[1] || url;
            let match = matches[0].trim();
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
            let src = matches[2].trim();
            let alt = matches[1].trim();

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

export default function (editor, koenig) {
    /* block level markdown ------------------------------------------------- */

    editor.unregisterTextInputHandler('heading');
    editor.onTextInput({
        name: 'md_heading',
        match: /^(#{1,6}) /,
        run(editor, matches) {
            let hashes = matches[1];
            let headingTag = `h${hashes.length}`;
            let {range} = editor;
            let text = range.head.section.textUntil(range.head);

            // we don't want to convert to a heading if the user has not just
            // finished typing the markdown (eg, they've made a previous
            // heading expansion then Cmd-Z'ed it to get the text back then
            // starts typing at the end of the heading)
            if (text !== matches[0]) {
                return;
            }

            editor.run((postEditor) => {
                range = range.extend(-(matches[0].length));
                let position = postEditor.deleteRange(range);
                postEditor.setRange(position);

                // toggleHeaderSection will remove all formatting except links
                koenig.send('toggleHeaderSection', headingTag, postEditor);
            });
        }
    });

    editor.unregisterTextInputHandler('ul');
    editor.onTextInput({
        name: 'md_ul',
        match: /^\* |^- /,
        run(editor, matches) {
            replaceWithListSection(editor, matches, 'ul');
        }
    });

    editor.unregisterTextInputHandler('ol');
    editor.onTextInput({
        name: 'md_ol',
        match: /^1\.? /,
        run(editor, matches) {
            replaceWithListSection(editor, matches, 'ol');
        }
    });

    editor.onTextInput({
        name: 'md_blockquote',
        match: /^> /,
        run(editor, matches) {
            let {range} = editor;
            let {head, head: {section}} = range;
            let text = section.textUntil(head);

            // ensure cursor is at the end of the matched text so we don't
            // convert text the users wants to start with `> ` and that we're
            // not already on a blockquote section
            if (text === matches[0] && section.tagName !== 'blockquote') {
                editor.run((postEditor) => {
                    range = range.extend(-(matches[0].length));
                    let position = postEditor.deleteRange(range);
                    postEditor.setRange(position);

                    koenig.send('toggleSection', 'blockquote', postEditor);
                });
            }
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

    editor.onTextInput({
        name: 'md_code',
        match: /^```$/,
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

            koenig.send('replaceWithCardSection', 'code', section.toRange());
        }
    });

    /* inline markdown -------------------------------------------------------*/

    // must come after block expansions so that the smart hyphens expansion
    // doesn't break the divider card expansion
    registerInlineMarkdownTextExpansions(editor);
}

// TODO: reduce duplication
export function registerBasicTextExpansions(editor) {
    // unregister mobiledoc-kit's block-level text handlers
    editor.unregisterTextInputHandler('heading');
    editor.unregisterTextInputHandler('ul');
    editor.unregisterTextInputHandler('ol');

    registerInlineMarkdownTextExpansions(editor);
}
