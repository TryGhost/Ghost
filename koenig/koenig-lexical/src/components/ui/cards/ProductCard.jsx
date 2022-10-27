import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {Button} from './ButtonCard';
import {ReactComponent as ProductPlaceholderIcon} from '../../../assets/icons/kg-product-placeholder.svg';

export function ProductCard({isSelected, image, title, titlePlaceholder, desc, descPlaceholder, button, buttonText}) {
    return (
        <div className="border border-grey/40 rounded p-4 w-full max-w-[550px] flex flex-col font-sans">
            {(image && <div className="w-full h-[324px] mb-4 bg-grey-200 border border-grey-200"></div>) || (isSelected &&
                <div className="mb-4">
                    <MediaPlaceholder
                        desc="Click to select a product image"
                        Icon={ProductPlaceholderIcon}
                        size='small'
                    />
                </div>)
            } 
            {(title || isSelected) && <h3 className={`font-bold text-xl text-black ${title || 'opacity-40'}`}>{title || titlePlaceholder}</h3>}
            {(desc || isSelected) && <p className={`mt-1 text-[1.6rem] font-normal text-grey-700 ${desc || 'opacity-50'}`}>{desc || descPlaceholder}</p>}
            {(button && (isSelected || buttonText)) && 
                <div className="mt-6 w-full">
                    <Button width='full' value={buttonText} />
                </div>
            }
        </div>
    );
}

ProductCard.propTypes = {
    isSelected: PropTypes.bool,
    image: PropTypes.bool,
    title: PropTypes.string,
    titlePlaceholder: PropTypes.string,
    desc: PropTypes.string,
    descPlaceholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string
};