import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {InputSetting, InputUrlSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ProductCardImage} from './ProductCard/ProductCardImage';
import {RatingButton} from './ProductCard/RatingButton';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';

export function ProductCard({
    isEditing,
    imgSrc,
    isButtonEnabled,
    buttonText,
    buttonUrl,
    rating,
    isRatingEnabled,
    onButtonToggle,
    onButtonTextChange,
    onButtonUrlChange,
    onRatingToggle,
    imgDragHandler,
    onImgChange,
    imgMimeTypes,
    imgUploader,
    isPinturaEnabled,
    openImageEditor,
    onRemoveImage,
    title,
    titleEditor,
    titleEditorInitialState,
    description,
    descriptionEditor,
    descriptionEditorInitialState,
    onRatingChange
}) {
    const showFilledButton = !!buttonUrl && !!buttonText && isButtonEnabled;
    const showButtonInEditMode = isButtonEnabled && isEditing;
    return (
        <>
            <div className="mx-auto my-4 flex w-full max-w-[550px] flex-col rounded border border-grey/40 p-5 font-sans dark:border-grey/20">
                <ProductCardImage
                    imgDragHandler={imgDragHandler}
                    imgMimeTypes={imgMimeTypes}
                    imgSrc={imgSrc}
                    imgUploader={imgUploader}
                    isEditing={isEditing}
                    isPinturaEnabled={isPinturaEnabled}
                    openImageEditor={openImageEditor}
                    onImgChange={onImgChange}
                    onRemoveImage={onRemoveImage}
                />

                <div className="!m-0 flex items-start justify-between">
                    {
                        (isEditing || !!title || !isEditorEmpty(titleEditor)) && (
                            <div className="mr-2 flex-1">
                                <KoenigNestedEditor
                                    autoFocus={true}
                                    focusNext={descriptionEditor}
                                    hasSettingsPanel={true}
                                    initialEditor={titleEditor}
                                    initialEditorState={titleEditorInitialState}
                                    nodes='minimal'
                                    placeholderClassName="whitespace-normal !text-[22px] !font-bold !leading-snug text-black opacity-40 dark:text-white !tracking-tight"
                                    placeholderText="Product title"
                                    singleParagraph={true}
                                    textClassName="koenig-lexical-product-title whitespace-normal"
                                />
                            </div>
                        )
                    }

                    {isRatingEnabled && (
                        <RatingButton rating={rating} onRatingChange={onRatingChange} />
                    )}
                </div>

                {
                    (isEditing || !!description || !isEditorEmpty(descriptionEditor)) && (
                        <div className="!mt-2">
                            <KoenigNestedEditor
                                hasSettingsPanel={true}
                                initialEditor={descriptionEditor}
                                initialEditorState={descriptionEditorInitialState}
                                placeholderClassName="!text-[1.6rem] !font-normal !leading-snug text-grey-700 opacity-50"
                                placeholderText="Description"
                                textClassName="koenig-lexical-product-description whitespace-normal text-grey-700"
                            />
                        </div>
                    )
                }

                {(showButtonInEditMode || showFilledButton) && (
                    <div className={`not-kg-prose mt-6 w-full ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} `}>
                        <Button dataTestId="product-button" href={buttonUrl} value={buttonText} width='full' />
                    </div>
                )}
            </div>

            {isEditing && (
                <SettingsPanel>
                    <ToggleSetting
                        dataTestId="product-rating-toggle"
                        isChecked={isRatingEnabled}
                        label='Rating'
                        onChange={onRatingToggle}
                    />
                    <SettingsDivider />
                    <ToggleSetting
                        dataTestId="product-button-toggle"
                        isChecked={isButtonEnabled}
                        label='Button'
                        onChange={onButtonToggle}
                    />
                    {isButtonEnabled && (
                        <>
                            <InputSetting
                                dataTestId="product-button-text-input"
                                label='Button text'
                                placeholder='Add button text'
                                value={buttonText}
                                onChange={onButtonTextChange}
                            />
                            <InputUrlSetting
                                dataTestId="product-button-url-input"
                                label='Button URL'
                                value={buttonUrl}
                                onChange={onButtonUrlChange}
                            />
                        </>
                    )}
                </SettingsPanel>
            )}

            {/* Read-only overlay */}
            {!isEditing && <div className="absolute top-0 z-10 !m-0 h-full w-full cursor-default p-0"></div>}
        </>
    );
}

ProductCard.propTypes = {
    isEditing: PropTypes.bool,
    imgSrc: PropTypes.string,
    imgWidth: PropTypes.string,
    imgHeight: PropTypes.string,
    isButtonEnabled: PropTypes.bool,
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string,
    isRatingEnabled: PropTypes.bool,
    rating: PropTypes.number,
    onButtonToggle: PropTypes.func,
    onButtonTextChange: PropTypes.func,
    onButtonUrlChange: PropTypes.func,
    onRatingToggle: PropTypes.func,
    onImgChange: PropTypes.func,
    onRemoveImage: PropTypes.func,
    imgDragHandler: PropTypes.object,
    imgUploader: PropTypes.object,
    imgMimeTypes: PropTypes.array
};
