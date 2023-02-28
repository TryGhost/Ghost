import React from 'react';
import {TextInput} from './TextInput';
import KoenigCaptionEditor from '../KoenigCaptionEditor';

function CaptionInput({value, placeholder, onChange, readOnly, dataTestId}) {
    return (
        <div
            className={`m-0 w-full px-9 text-center ${readOnly ? 'pointer-events-none' : ''}`}
            data-testid={dataTestId}
        >
            <KoenigCaptionEditor
                readOnly={readOnly}
                html={value}
                setHtml={onChange}
                placeholderText={placeholder}
            />
        </div>
    );
}

function AltTextInput({value, placeholder, onChange, readOnly, dataTestId, autoFocus = true}) {
    return (
        <TextInput
            onChange={onChange}
            value={value}
            className="not-kg-prose w-full px-9 text-center font-sans text-sm font-normal leading-8 tracking-wide text-grey-900"
            placeholder={placeholder}
            readOnly={readOnly}
            data-testid={dataTestId}
            autoFocus={autoFocus}
        />
    );
}

function AltToggleButton({isEditingAlt, onClick}) {
    return (
        <button
            name="alt-toggle-button"
            className={`absolute bottom-0 right-0 m-2 cursor-pointer rounded border px-1 font-sans text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${isEditingAlt ? 'border-green bg-green text-white' : 'border-grey text-grey' } `}
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
    caption,
    captionPlaceholder,
    setCaption,
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

    if (isSelected || caption) {
        return (
            <figcaption className="flex min-h-[40px] w-full p-2">
                {isEditingAlt
                    ? <AltTextInput value={altText} placeholder={altTextPlaceholder} onChange={setAltText} readOnly={readOnly} dataTestId={dataTestId} />
                    : <CaptionInput value={caption} placeholder={captionPlaceholder} onChange={setCaption} readOnly={readOnly} dataTestId={dataTestId}/> }
                {setAltText && <AltToggleButton isEditingAlt={isEditingAlt} onClick={toggleIsEditingAlt} />}
            </figcaption>
        );
    }
}
