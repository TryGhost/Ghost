// helper function to insert image cards at or after the current active section
// used when pasting or dropping image files
export function insertImageCards(files, postEditor) {
    let {builder, editor} = postEditor;
    let collection = editor.post.sections;
    let section = editor.activeSection;

    // when dropping an image on the editor before it's had focus there will be
    // no active section so we insert the image at the end of the document
    if (!section) {
        section = editor.post.sections.tail;

        // create a blank paragraph at the end of the document if needed because
        // we use `insertSectionBefore` and don't want the image to be added
        // before the last card
        if (!section.isMarkerable) {
            let blank = builder.createMarkupSection();
            postEditor.insertSectionAtEnd(blank);
            postEditor.setRange(blank.toRange());
            section = postEditor._range.head.section;
        }
    }

    // place the card after the active section
    if (!section.isBlank && !section.isListItem && section.next) {
        section = section.next;
    }

    // list items cannot contain card sections so insert a blank paragraph after
    // the whole list ready to be replaced by the image cards
    if (section.isListItem) {
        let list = section.parent;
        let blank = builder.createMarkupSection();
        if (list.next) {
            postEditor.insertSectionBefore(collection, blank, list.next);
        } else {
            postEditor.insertSectionAtEnd(blank);
        }
        postEditor.setRange(blank.toRange());
        section = postEditor._range.head.section;
    }

    // insert an image card for each image, keep track of the last card to be
    // inserted so that the cursor can be placed on it at the end
    let lastImageSection;
    files.forEach((file) => {
        let payload = {
            files: [file]
        };
        lastImageSection = builder.createCardSection('image', payload);
        postEditor.insertSectionBefore(collection, lastImageSection, section);
    });

    // remove the current section if it's blank - avoids unexpected blank
    // paragraph after the insert is complete
    if (section.isBlank) {
        postEditor.removeSection(section);
    }

    // place cursor on the last inserted image
    postEditor.setRange(lastImageSection.tailPosition());
}
