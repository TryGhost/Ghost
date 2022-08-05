import * as React from 'react';
import {Container, Editor} from 'react-mobiledoc-editor';
import KoenigEditor from '../KoenigEditor';
import DEFAULT_ATOMS from '../atoms';
import DEFAULT_KEY_COMMANDS from '../key-commands';
import DEFAULT_TEXT_EXPANSIONS from '../text-expansions';
import Toolbar from './toolbar';

const Koenig = ({
    mobiledoc,
    atoms = DEFAULT_ATOMS,
    keyCommands = DEFAULT_KEY_COMMANDS,
    textExpansions = DEFAULT_TEXT_EXPANSIONS,
    didCreateEditor,
    onChange,
    TOOLBAR_MARGIN = 60,
    TICK_ADJUSTMENT = 8
}) => {
    const DEFAULTSTYLES = {
        top: 0,
        left: 0,
        right: 0
    };
    const editorRef = React.useRef();
    const [showToolbar, setShowToolbar] = React.useState(false);
    const [toolbarPosition, setToolbarPosition] = React.useState(DEFAULTSTYLES);
    const [, setKoenigInstance] = React.useState(null);
    const [mobiledocInstance, setMobiledocInstance] = React.useState(null);
    const [, setEditorRange] = React.useState(null);
    const [hasSelectedRange, setHasSelectedRange] = React.useState(false);
    const [onMousemoveHandler, setOnMousemoveHandler] = React.useState(null);
    const [, setIsMouseDown] = React.useState(false);
    const [isMouseUp, setIsMouseUp] = React.useState(false);

    function _didCreateEditor(mobiledocEditor) {
        const koenig = new KoenigEditor(mobiledocEditor, {atoms, keyCommands, textExpansions});

        setMobiledocInstance(mobiledocEditor);
        setKoenigInstance(koenig);
        didCreateEditor?.(mobiledocEditor, koenig);
    }

    function _toggleVisibility(bool) {
        if (bool) {
            _showToolbar();
        }
        if (!bool) {
            _hideToolbar();
        }
    }

    const _handleMousedown = React.useCallback((event) => {
        if (event.which === 1) {
            setIsMouseDown(true);
            setIsMouseUp(false);
            // prevent mousedown on toolbar buttons losing editor focus before the following click event can trigger the buttons behaviour
            // if (editorRef.current.editor.element.contains(event.target)) {
            //     // event.preventDefault();
            // }
        }
    }, []);

    const _handleMousemove = React.useCallback((event) => {
        if (hasSelectedRange && !showToolbar) {
            setShowToolbar(true);
        }
        _removeMousemoveHandler();
    }, []);

    function _removeMousemoveHandler() {
        window.removeEventListener('mousemove', onMousemoveHandler);
        setOnMousemoveHandler(null);
    }

    const _handleMouseup = React.useCallback((event) => {
        if (event.which === 1) {
            setIsMouseUp(true);
            setIsMouseDown(false);
        }
    }, []);

    function _showToolbar() {
        _positionToolbar();
        setShowToolbar(true);
        if (!showToolbar && onMousemoveHandler) {
            // this._onMousemoveHandler = run.bind(this, this._handleMousemove);
            window.addEventListener('mousemove', onMousemoveHandler);
        }
    }

    function _hideToolbar() {
        _removeMousemoveHandler();
        setShowToolbar(false);
    }

    function _positionToolbar() {
        let containerRect = editorRef.current.editor.element.offsetParent.getBoundingClientRect();
        let range = window.getSelection().getRangeAt(0);
        let rangeRect = range.getBoundingClientRect();
        let {width} = editorRef.current.editor.element.getBoundingClientRect();
        let newPosition = {};

        // rangeRect is relative to the viewport so we need to subtract the
        // container measurements to get a position relative to the container
        newPosition = {
            top: rangeRect.top - containerRect.top - TOOLBAR_MARGIN,
            left: rangeRect.left - containerRect.left + rangeRect.width / 2 - width / 2,
            right: null
        };

        // let tickPosition = 50;
        // // don't overflow left boundary
        // if (newPosition.left < 0) {
        //     newPosition.left = 0;

        //     // calculate the tick percentage position
        //     let absTickPosition = rangeRect.left - containerRect.left + rangeRect.width / 2;
        //     tickPosition = absTickPosition / width * 100;
        //     if (tickPosition < 5) {
        //         tickPosition = 5;
        //     }
        // }
        // same for right boundary
        // if (newPosition.left + width > containerRect.width) {
        //     newPosition.left = null;
        //     newPosition.right = 0;

        //     // calculate the tick percentage position
        //     let absTickPosition = rangeRect.right - containerRect.right - rangeRect.width / 2;
        //     tickPosition = 100 + absTickPosition / width * 100;
        //     if (tickPosition > 95) {
        //         tickPosition = 95;
        //     }
        // }

        // the tick is a pseudo-element so we the only way we can affect it's
        // style is by adding a style element to the head
        // this._removeStyleElement(); // reset to base styles
        // if (tickPosition !== 50) {
        //     this._addStyleElement(tickPosition);
        // }

        // update the toolbar position
        setToolbarPosition(newPosition);
    }

    React.useEffect(() => {
        window.addEventListener('mousemove', _handleMousemove);
        window.addEventListener('mouseup', _handleMouseup);
        window.addEventListener('mousedown', _handleMousedown);
    
        return () => {
            window.addEventListener('mousemove', _handleMousemove);
            window.addEventListener('mouseup', _handleMouseup);
            window.addEventListener('mousedown', _handleMousedown);
        };
    }, [_handleMousemove, _handleMousedown, _handleMouseup]);

    const toolbarPositionStyles = {
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
        right: `${toolbarPosition.right}px`,
        position: `absolute`,
        zIndex: `299`
    };

    React.useEffect(() => {
        if (isMouseUp) {
            if (mobiledocInstance?.range?.direction){
                setEditorRange(mobiledocInstance.range);
                setHasSelectedRange(true);
                _toggleVisibility(true);
            } else {
                setHasSelectedRange(false);
                setEditorRange(null);
                _toggleVisibility(false);
            }
        }
    }, [isMouseUp, mobiledocInstance]);

    return (
        <Container
            ref={editorRef}
            id="mobiledoc-editor"
            data-testid="mobiledoc-container"
            className=""
            mobiledoc={mobiledoc}
            atoms={atoms}
            onChange={onChange}
            didCreateEditor={_didCreateEditor}
            placeholder="Begin writing your post...">  
            <div style={toolbarPositionStyles}
                className={`${showToolbar ? 'absolute' : 'hidden'}`} >
                <Toolbar editor={mobiledocInstance} /> 
            </div>
            <Editor
                data-testid="mobiledoc-editor"
                className="prose" />
        </Container>
    );
};

export default Koenig;
