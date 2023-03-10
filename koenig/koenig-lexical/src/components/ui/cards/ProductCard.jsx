import PropTypes from 'prop-types';
import React from 'react';
import {Button} from '../Button';
import {InputSetting, SettingsDivider, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as StarIcon} from '../../../assets/icons/kg-star.svg';

export function ProductCard({isEditing, image, title, titlePlaceholder, desc, descPlaceholder, button, buttonText, buttonUrl, rating}) {
    return (
        <>
            <div className="flex w-full max-w-[550px] flex-col rounded border border-grey/40 p-4 font-sans">
                {(image && <div className="mb-4 h-[324px] w-full border border-grey-200 bg-grey-200"></div>) || (isEditing &&
                <div className="mb-4">
                    <MediaPlaceholder
                        desc="Click to select a product image"
                        icon='product'
                        size='small'
                    />
                </div>)
                } 
                <div className="flex items-start justify-between">
                    {(title || isEditing) && <h3 className={`text-xl font-bold leading-snug text-black ${title || 'opacity-40'} ${rating && 'mr-2'}`}>{title || titlePlaceholder}</h3>}
                    {rating && 
                    <div className="ml-auto flex fill-grey-900 transition-all duration-75 hover:fill-grey-800">
                        <RatingButton />
                    </div>
                    }
                </div>
                {(desc || isEditing) && <p className={`mt-2 text-[1.6rem] font-normal leading-snug text-grey-700 ${desc || 'opacity-50'}`}>{desc || descPlaceholder}</p>}
                {(button && (isEditing || (buttonText || buttonUrl))) && 
                <div className={`mt-6 w-full ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} `}>
                    <Button url={buttonUrl} value={buttonText} width='full' />
                </div>
                }
            </div>

            {isEditing && (
                <SettingsPanel>
                    <ToggleSetting
                        isChecked={rating}
                        label='Rating'
                    />
                    <SettingsDivider />
                    <ToggleSetting
                        isChecked={button}
                        label='Button'
                    />
                    {button && (
                        <>
                            <InputSetting
                                label='Button text'
                                placeholder='Add button text'
                                value={buttonText}
                            />
                            <InputSetting
                                label='Button URL'
                                placeholder='https://yoursite.com/#/portal/signup/'
                                value={buttonUrl}
                            />
                        </>
                    )}
                </SettingsPanel>    
            )}
        </>
    );
}

function RatingButton() {
    const n = 5;
    return (
        [...Array(n)].map(i => <button key={i} className="flex h-7 w-5 items-center justify-center"><StarIcon /></button>)
    );
}

ProductCard.propTypes = {
    image: PropTypes.bool,
    title: PropTypes.string,
    titlePlaceholder: PropTypes.string,
    desc: PropTypes.string,
    descPlaceholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string,
    buttonUrl: PropTypes.string,
    rating: PropTypes.bool
};