import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as ArrowDownIcon} from '../../../assets/icons/kg-toggle-arrow.svg';

export function ToggleCard({header, headerPlaceholder, content, contentPlaceholder}) {
    return (
        <div className="border border-grey/40 rounded py-4 px-6">
            <div className="flex justify-between items-start">
                <div className={`font-sans text-xl font-bold text-black leading-relaxed ${header ? 'opacity-100' : 'opacity-40'}`}>
                    {header || headerPlaceholder}
                </div>
                <div className="shrink-0 ml-2 w-8 h-8 flex items-center justify-center">
                    <ArrowDownIcon className="w-4 h-4 text-grey-400 stroke-2" />
                </div>
            </div>
            <div className={`w-full font-serif font-normal text-xl text-grey-900 leading-relaxed mt-2 ${content ? 'opacity-100' : 'opacity-40'} `}>
                {content || contentPlaceholder}
            </div>
        </div>
    );
}

ToggleCard.propTypes = {
    header: PropTypes.string,
    headerPlaceholder: PropTypes.string,
    content: PropTypes.string,
    contentPlaceholder: PropTypes.string
};