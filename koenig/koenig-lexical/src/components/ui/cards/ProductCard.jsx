import KoenigProductEditor from '../../KoenigProductEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {InputSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
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
                    onImgChange={onImgChange}
                    onRemoveImage={onRemoveImage}
                />

                <div className="m-0 flex items-start justify-between">
                    {
                        (isEditing || !!title || !isEditorEmpty(titleEditor)) && (
                            <div className="mr-2 flex-1">
                                <KoenigProductEditor
                                    autoFocus={true}
                                    focusNext={descriptionEditor}
                                    initialEditor={titleEditor}
                                    initialEditorState={titleEditorInitialState}
                                    nodes='minimal'
                                    placeholderClassName="text-[22px] font-bold leading-snug text-black opacity-40 dark:text-white tracking-tight"
                                    placeholderText="Product title"
                                    singleParagraph={true}
                                    textClassName="kg-product-title leading-snug text-[22px] dark:text-grey-100"
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
                        <div className="mt-2">
                            <KoenigProductEditor
                                initialEditor={descriptionEditor}
                                initialEditorState={descriptionEditorInitialState}
                                placeholderClassName="text-[1.6rem] font-normal leading-snug text-grey-700 opacity-50"
                                placeholderText="Description"
                                textClassName="kg-product-description"
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
                        dataTestID="product-rating-toggle"
                        isChecked={isRatingEnabled}
                        label='Rating'
                        onChange={onRatingToggle}
                    />
                    <SettingsDivider />
                    <ToggleSetting
                        dataTestID="product-button-toggle"
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
                            <InputSetting
                                dataTestId="product-button-url-input"
                                label='Button URL'
                                placeholder='https://yoursite.com/#/portal/signup/'
                                value={buttonUrl}
                                onChange={onButtonUrlChange}
                            />
                        </>
                    )}
                </SettingsPanel>
            )}

            {!isEditing && <div className="absolute top-0 z-10 m-0 h-full w-full cursor-default p-0"></div>}
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
