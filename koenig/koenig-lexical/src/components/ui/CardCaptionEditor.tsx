import KoenigCaptionEditor from '../KoenigCaptionEditor';
import React from 'react';
import {TextInput} from './TextInput';
import {isEditorEmpty} from '../../utils/isEditorEmpty';

function CaptionInput({captionEditor, captionEditorInitialState, placeholder, dataTestId}) {
    return (
        <div
            className={`m-0 w-full px-9 text-center`}
            data-testid={dataTestId}
            data-kg-allow-clickthrough
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
    const handleChange = (e) => {
        onChange?.(e.target.value);
    };

    return (
        <TextInput
            autoFocus={autoFocus}
            className="not-kg-prose w-full bg-transparent px-9 text-center font-sans text-sm font-normal leading-[1.625] tracking-wide text-grey-800 placeholder:text-grey-500 dark:text-grey-500 dark:placeholder:text-grey-800"
            controlled={true}
            data-testid={dataTestId}
            placeholder={placeholder}
            readOnly={readOnly}
            value={value}
            data-koenig-dnd-disabled
            onChange={handleChange}
        />
    );
}

function AltToggleButton({isEditingAlt, onClick, grouped = false}) {
    return (
        <button
            className={`${grouped ? '' : 'absolute bottom-0 right-0 m-2'} cursor-pointer rounded-md border px-1 font-sans text-[1.3rem] font-normal leading-7 tracking-wide transition-all duration-100 ${isEditingAlt ? 'border-green bg-green text-white' : 'border-grey text-grey' } `}
            data-testid="alt-toggle-button"
            name="alt-toggle-button"
            type="button"
            onClick={onClick}
        >
            Alt
        </button>
    );
}

function GenerateAltTextButton({isGenerating, onClick}) {
    return (
        <button
            className="cursor-pointer rounded-md border border-grey px-2 font-sans text-[1.3rem] font-normal leading-7 tracking-wide text-grey transition-all duration-100 disabled:cursor-default disabled:opacity-60"
            data-testid="generate-alt-text-button"
            disabled={isGenerating}
            type="button"
            onClick={onClick}
        >
            {isGenerating ? 'Generating…' : 'Generate'}
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
    dataTestId,
    generateAltText,
    imageUrl
}) {
    const [isEditingAlt, setIsEditingAlt] = React.useState(false);
    const [isGeneratingAlt, setIsGeneratingAlt] = React.useState(false);
    const [generationError, setGenerationError] = React.useState('');

    const toggleIsEditingAlt = (e) => {
        e.stopPropagation();
        setGenerationError('');
        setIsEditingAlt(!isEditingAlt);
    };

    const generateImageAltText = async (e) => {
        e.stopPropagation();

        if (isGeneratingAlt || !generateAltText || !imageUrl) {
            return;
        }

        try {
            setGenerationError('');
            setIsGeneratingAlt(true);
            const generatedAltText = await generateAltText(imageUrl);
            setAltText(generatedAltText);
        } catch (error) {
            setGenerationError(error?.message || 'Alt text could not be generated.');
        } finally {
            setIsGeneratingAlt(false);
        }
    };

    // always switch back to displaying caption when card is not selected
    React.useEffect(() => {
        if (!isSelected) {
            setIsEditingAlt(false);
        }
    }, [isSelected, setIsEditingAlt]);

    const isCaptionEmpty = isEditorEmpty(captionEditor);
    const showAltToggle = setAltText && isSelected;

    const showInlineButtons = showAltToggle && isEditingAlt && generateAltText && imageUrl;

    return (
        ((isSelected || !isCaptionEmpty) &&
            <figcaption className="relative flex min-h-[40px] w-full items-center p-2">
                <div className="flex-1 overflow-hidden">
                    {isEditingAlt
                        ? <AltTextInput dataTestId={dataTestId} placeholder={altTextPlaceholder} readOnly={readOnly} value={altText} onChange={setAltText} />
                        : <CaptionInput captionEditor={captionEditor} captionEditorInitialState={captionEditorInitialState} dataTestId={dataTestId} placeholder={captionPlaceholder} />}
                </div>
                {generationError && <span className="absolute left-2 top-full font-sans text-xs text-red" role="alert">{generationError}</span>}
                {showAltToggle && (showInlineButtons
                    ? <div className="ml-1 flex shrink-0 gap-1">
                        <GenerateAltTextButton isGenerating={isGeneratingAlt} onClick={generateImageAltText} />
                        <AltToggleButton isEditingAlt={isEditingAlt} grouped onClick={toggleIsEditingAlt} />
                    </div>
                    : <AltToggleButton isEditingAlt={isEditingAlt} onClick={toggleIsEditingAlt} />
                )}
            </figcaption>
        )
    );
}
