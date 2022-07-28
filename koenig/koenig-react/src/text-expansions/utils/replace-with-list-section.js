export default function replaceWithListSection(editor, matches, listTagName) {
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
