export function canInsertCardsFromFiles(files) {
    return filterAllowedFiles(files).length > 0;
}

// helper function to insert cards at or after the current active section
// used when pasting or dropping image files
export function insertCardsFromFiles(_files, postEditor) {
    const files = filterAllowedFiles(_files);

    if (!files.length) {
        return;
    }

    const {builder, editor} = postEditor;
    const collection = editor.post.sections;
    let section = editor.activeSection;

    // when dropping an file on the editor before it's had focus there will be
    // no active section so we insert the card at the end of the document
    if (!section) {
        section = editor.post.sections.tail;

        // create a blank paragraph at the end of the document if needed because
        // we use `insertSectionBefore` and don't want the image to be added
        // before the last card
        if (!section.isMarkerable) {
            const blank = builder.createMarkupSection();
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
        const list = section.parent;
        const blank = builder.createMarkupSection();
        if (list.next) {
            postEditor.insertSectionBefore(collection, blank, list.next);
        } else {
            postEditor.insertSectionAtEnd(blank);
        }
        postEditor.setRange(blank.toRange());
        section = postEditor._range.head.section;
    }

    // insert a card for each file, keep track of the last card to be
    // inserted so that the cursor can be placed on it at the end
    let lastCardSection;
    files.forEach((file) => {
        const cardName = getCardNameFromFile(file);
        const payload = {
            files: [file]
        };
        lastCardSection = builder.createCardSection(cardName, payload);
        postEditor.insertSectionBefore(collection, lastCardSection, section);
    });

    // remove the current section if it's blank - avoids unexpected blank
    // paragraph after the insert is complete
    if (section.isBlank) {
        postEditor.removeSection(section);
    }

    // place cursor on the last inserted image
    postEditor.setRange(lastCardSection.tailPosition());
}

function filterAllowedFiles(files) {
    return Array.from(files).filter(file => file.type.match(/^(image|video|audio)/));
}

function getCardNameFromFile(file) {
    if (file.type.startsWith('image')) {
        return 'image';
    }

    if (file.type.startsWith('video')) {
        return 'video';
    }

    if (file.type.startsWith('audio')) {
        return 'audio';
    }
}
