import KoenigCaptionEditor from '../KoenigCaptionEditor';
import React from 'react';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {TextInput} from './TextInput';

function CaptionInput({captionEditor, captionEditorInitialState, placeholder, dataTestId}) {
    return (
        <div
            className={`m-0 w-full px-9 text-center`}
            data-testid={dataTestId}
        >
            <KoenigCaptionEditor
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                placeholderText={placeholder}
            />
        </div>
    );
}

function AltTextInput({value, placeholder, onChange, readOnly, dataTestId, autoFocus = true}) {
    return (
        <TextInput
            autoFocus={autoFocus}
            className="not-kg-prose w-full bg-transparent px-9 text-center font-sans text-sm font-normal leading-8 tracking-wide text-grey-900 placeholder:text-grey-800 dark:text-grey-500"
            data-testid={dataTestId}
            placeholder={placeholder}
            readOnly={readOnly}
            value={value}
            onChange={onChange}
        />
    );
}

function AltToggleButton({isEditingAlt, onClick}) {
    return (
        <button
            className={`absolute bottom-0 right-0 m-2 cursor-pointer rounded border px-1 font-sans text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${isEditingAlt ? 'border-green bg-green text-white' : 'border-grey text-grey' } `}
            name="alt-toggle-button"
            type="button"
            onClick={onClick}
        >
            Alt
        </button>
    );
}

export function CardCaptionEditor({
    altText,
    altTextPlaceholder,
    setAltText,
    captionEditor,
    captionEditorInitialState,
    captionPlaceholder,
    isSelected,
    readOnly,
    dataTestId
}) {
    const [isEditingAlt, setIsEditingAlt] = React.useState(false);

    const toggleIsEditingAlt = (e) => {
        e.stopPropagation();
        setIsEditingAlt(!isEditingAlt);
    };

    // always switch back to displaying caption when card is not selected
    React.useEffect(() => {
        if (!isSelected) {
            setIsEditingAlt(false);
        }
    }, [isSelected, setIsEditingAlt]);

    const isCaptionEmpty = captionEditor.getEditorState().read($canShowPlaceholderCurry(false));

    return (
        ((isSelected || !isCaptionEmpty) &&
            <figcaption className="flex min-h-[40px] w-full p-2">
                {isEditingAlt
                    ? <AltTextInput dataTestId={dataTestId} placeholder={altTextPlaceholder} readOnly={readOnly} value={altText} onChange={setAltText} />
                    : <CaptionInput captionEditor={captionEditor} captionEditorInitialState={captionEditorInitialState} dataTestId={dataTestId} placeholder={captionPlaceholder} /> }
                {setAltText && <AltToggleButton isEditingAlt={isEditingAlt} onClick={toggleIsEditingAlt} />}
            </figcaption>
        )
    );
}
