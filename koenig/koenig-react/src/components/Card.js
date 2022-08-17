import React from 'react';

const CardComponent = ({children, isSelected, isEditing, koenigOptions, selectCard, deselectCard, editCard, mobiledocEditor, ...props}) => {
    const [skipMouseUp, setSkipMouseUp] = React.useState(false);
    const elementRef = React.useRef(null);

    const {hasEditMode} = koenigOptions;

    const classes = [
        'relative',
        'caret-grey-middark',
        'hover:shadow-green',
        'hover:shadow-[0_0_0_1px]'
    ];

    if (isSelected) {
        classes.push('shadow-green shadow-[0_0_0_2px] hover:shadow-[0_0_0_2px]');
    }

    // when selected or in edit mode, any clicks outside of the card should deselect
    // unless it's a click on the plus menu
    React.useEffect(() => {
        const handleWindowClick = (event) => {
            const {target} = event;
            const path = event.composedPath();

            let searchPath = function (selector) {
                return element => element.closest && element.closest(selector);
            };

            // check if the click was in the card, on the plus menu
            const cardTargetElem = elementRef.current?.closest('[data-kg-card]');
            if (elementRef.current?.contains(target)
                || (cardTargetElem && path.find(searchPath(`#${cardTargetElem.id}`)))
                || path.find(searchPath('[data-kg="plus-menu"]'))) {
                return;
            }

            // if an element in the editor is clicked then cursor placement will
            // deselect or keep this card selected as necessary
            if (mobiledocEditor.element.contains(target)) {
                return;
            }

            deselectCard();
        };

        if (isSelected) {
            window.addEventListener('click', handleWindowClick);
        }

        return (() => {
            window.removeEventListener('click', handleWindowClick);
        });
    }, [isSelected, deselectCard, mobiledocEditor]);

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
            ref={elementRef}
        >
            {children}
        </div>
    );
};

export default CardComponent;
