import React from 'react';

const CardComponent = ({children, isSelected, isEditing, koenigOptions, selectCard, editCard, ...props}) => {
    const {hasEditMode} = koenigOptions;

    const [skipMouseUp, setSkipMouseUp] = React.useState(false);

    const classes = [
        'relative',
        'caret-grey-middark',
        'hover:shadow-green',
        'hover:shadow-[0_0_0_1px]'
    ];

    if (isSelected) {
        classes.push('shadow-green shadow-[0_0_0_2px] hover:shadow-[0_0_0_2px]');
    }

    const handleMouseDown = (event) => {
        // if we perform an action we want to prevent the mousedown from
        // triggering a cursor position change which can result in multiple
        // card select calls getting the component into an odd state. We also
        // manually show the toolbar so that we're not relying on mousemove
        if (!isSelected && !isEditing) {
            selectCard();

            // TODO: implement card toolbar
            // this.set('showToolbar', true);

            // in most situations we want to prevent default behaviour which
            // can cause an underlying cursor position change but inputs and
            // textareas are different and we want the focus to move to them
            // immediately when clicked
            const targetTagName = event.target.tagName;
            const allowedTagNames = ['INPUT', 'TEXTAREA'];
            const allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');
            if (!allowedTagNames.includes(targetTagName) && !allowClickthrough) {
                event.preventDefault();
            }

            // don't trigger edit mode immediately
            setSkipMouseUp(true);
        }

        // don't trigger select->edit transition for clicks in the caption or
        // when clicking out of the caption
        if (isSelected && hasEditMode) {
            const allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');
            // TODO: disable mouse up skipping when caption is focused
            if (allowClickthrough/* || this.koenigUi.captionHasFocus*/) {
                setSkipMouseUp(true);
            }
        }
    };

    // lazy-click to enter edit mode
    const handleMouseUp = (event) => {
        // we want to allow toolbar buttons to be clicked without going into edit mode
        if (event.target.closest('[data-kg-toolbar]')) {
            setSkipMouseUp(true);
            return;
        }

        // TODO: disable mouse up handling when KoenigEditor is handling dragging
        if (!skipMouseUp && hasEditMode && isSelected && !isEditing/* && !this.koenigUi.isDragging*/) {
            editCard();

            // TODO: implement card toolbar
            // this.set('showToolbar', true);

            event.preventDefault();
        }

        setSkipMouseUp(false);
    };

    const handleDoubleClick = (event) => {
        const allowClickthrough = !!event.target.closest('[data-kg-allow-clickthrough]');

        if (hasEditMode && !isEditing && !allowClickthrough) {
            editCard();

            // TODO: implement card toolbar
            // this.set('showToolbar', true);
        }
    };

    return (
        <div
            className={classes.join(' ')}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            style={props.style}
        >
            {children}
        </div>
    );
};

export default CardComponent;
